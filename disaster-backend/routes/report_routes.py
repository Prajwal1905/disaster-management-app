from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
import os
from datetime import datetime
from bson import ObjectId
from geopy.geocoders import Nominatim
from utils.authority_alert import find_authorities_nearby
from utils.hazard_mapping import ROLE_ALERT_MAPPING,ROLE_RADIUS
from bson import ObjectId

report_bp = Blueprint("report", __name__)


ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "mp4", "mov"}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def convert_objectid_to_str(d):
    if isinstance(d, dict):
        return {k: convert_objectid_to_str(v) for k, v in d.items()}
    elif isinstance(d, list):
        return [convert_objectid_to_str(i) for i in d]
    elif isinstance(d, ObjectId):
        return str(d)
    else:
        return d
    
def predict_severity(description: str) -> str:
    description = description.lower() if description else ""
    
    high_keywords = ['fire', 'collapse', 'explosion', 'flood', 'landslide', 'injury', 'gas leak', 'major']
    medium_keywords = ['road block', 'power outage', 'minor injury', 'fallen tree', 'blocked', 'delayed']
    low_keywords = ['noise', 'spill', 'debris', 'litter', 'small']
    
    for word in high_keywords:
        if word in description:
            return "High"
    for word in medium_keywords:
        if word in description:
            return "Medium"
    for word in low_keywords:
        if word in description:
            return "Low"
    # Default
    return "Low"

@report_bp.route("/hazard-report", methods=["POST"])
def report_hazard():
    try:
        db = current_app.db
        data = request.form
        latitude = float(data.get("latitude")) if data.get("latitude") else None
        longitude = float(data.get("longitude")) if data.get("longitude") else None

        location = data.get("address")
        hazard_type = data.get("type", "").strip().lower()
        description = data.get("description")
        name = data.get("name")
        contact = data.get("contact")

        # Predict severity
        severity = predict_severity(description)

        # Reverse geocode if location not provided
        if not location and latitude and longitude:
            location = reverse_geocode(latitude, longitude)
        location_text = location or "Unknown"

        # Handle uploaded file
        file = request.files.get("file")
        file_url = None
        file_type = None
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            ext = filename.rsplit('.', 1)[1].lower()
            file_type = "image" if ext in ["png", "jpg", "jpeg"] else "video"
            upload_folder = f"static/uploads/{'photos' if file_type=='image' else 'videos'}"
            os.makedirs(upload_folder, exist_ok=True)
            filepath = os.path.join(upload_folder, filename)
            file.save(filepath)
            filepath = filepath.replace("\\", "/")
            file_url = f"/{filepath}"


        # Notify nearby authorities with fallback
        nearby_authorities = []
        if latitude and longitude and hazard_type:
            role_required = ROLE_ALERT_MAPPING.get(hazard_type.lower())
            radius = ROLE_RADIUS.get(role_required, 15)

            print("Hazard type:", hazard_type, "Role required:", role_required)

            if role_required:
                nearby_authorities = find_authorities_nearby(role_required, [longitude, latitude], radius)
                if not nearby_authorities:
                    # fallback: get all authorities of that role
                    nearby_authorities = list(db.authorities.find({"role": role_required}))

            print("Nearby authorities found:", [str(a['_id']) for a in nearby_authorities])

        # Construct hazard object
        hazard = {
            "name": name,
            "contact": contact,
            "type": hazard_type,
            "description": description,
            "latitude": latitude,
            "longitude": longitude,
            "location": {"type": "Point", "coordinates": [longitude, latitude]},
            "location_text": location_text,
            "severity": severity,
            "timestamp": datetime.utcnow().isoformat(),
            "file_url": file_url,
            "file_type": file_type,
            "status": "live",
            "notified_authorities": [str(a["_id"]) for a in nearby_authorities]
        }

        # Insert into DB
        result = db.report.insert_one(hazard)

        # Emit via SocketIO
        hazard = convert_objectid_to_str(hazard)
        socketio = current_app.socketio
        socketio.emit("new_alert", {"_id": str(result.inserted_id), **hazard})

        return jsonify({
            "message": "Hazard reported successfully",
            "id": str(result.inserted_id),
            "severity": severity,
            "notified_authorities": [a.get("email") for a in nearby_authorities]
        }), 201

    except Exception as e:
        import traceback
        print("Error in /hazard-report:", e)
        traceback.print_exc()
        return jsonify({"error": f"Failed to submit hazard: {str(e)}"}), 500



def reverse_geocode(lat, lon):
    try:
        geolocator = Nominatim(user_agent="disaster_app")


        location = geolocator.reverse(f"{lat}, {lon}", timeout=10, language="en")
        if location and location.raw.get("address"):
            addr = location.raw["address"]
            return addr.get("city") or addr.get("town") or addr.get("village") or addr.get("suburb") or "Unknown"
        return "Unknown"
    except Exception as e:
        print("Reverse geocode error:", e)
        return "Unknown"

@report_bp.route("/recent-hazard-alerts", methods=["GET"])
def recent_hazard_alerts():
    try:
        db = current_app.db
        # Fetch 5 most recent live alerts
        alerts = list(
            db.report.find({"status": "live"}).sort("timestamp", -1).limit(5)
        )
        for alert in alerts:
            alert["_id"] = str(alert["_id"])
            alert["timestamp"] = alert.get("timestamp", datetime.utcnow()).isoformat()
        return jsonify(alerts), 200
    except Exception as e:
        print("Error fetching recent hazard alerts:", e)
        return jsonify({"error": "Failed to fetch recent alerts"}), 500

@report_bp.route("/nearby-alerts", methods=["GET"])
def nearby_alerts():
    try:
        db = current_app.db
        lat = float(request.args.get("lat", 0))
        lon = float(request.args.get("lon", 0))
        radius_km = float(request.args.get("radius", 10))  # default 10 km

        query = {
            "status": "live",
            "location": {
                "$near": {
                    "$geometry": {"type": "Point", "coordinates": [lon, lat]},
                    "$maxDistance": radius_km * 1000,  # convert km to meters
                }
            },
        }

        alerts = list(db.report.find(query).sort("timestamp", -1))
        for alert in alerts:
            alert["_id"] = str(alert["_id"])
            alert["timestamp"] = alert.get("timestamp", datetime.utcnow()).isoformat()

        return jsonify(alerts), 200

    except Exception as e:
        print("Error fetching nearby alerts:", e)
        return jsonify({"error": "Failed to fetch nearby alerts"}), 500

@report_bp.route("/all-alerts", methods=["GET"])
def get_all_alerts():
    try:
        db = current_app.db

        # Fetch hazard reports
        hazards = list(db.report.find().sort("timestamp", -1))
        for h in hazards:
            h["_id"] = str(h["_id"])
            h["source"] = "hazard"

        # Fetch SOS alerts
        sos_alerts = list(db.sos_alerts.find().sort("timestamp", -1))
        for s in sos_alerts:
            s["_id"] = str(s["_id"])
            s["source"] = "sos"

        # Merge both
        all_alerts = hazards + sos_alerts

        # Sort combined list by timestamp (latest first)
        all_alerts.sort(key=lambda x: x.get("timestamp", ""), reverse=True)

        return jsonify(all_alerts), 200

    except Exception as e:
        print("Error in /all-alerts:", e)
        return jsonify({"error": "Failed to fetch alerts"}), 500
