from flask import Blueprint, request, jsonify, current_app, send_from_directory
from datetime import datetime
from bson import ObjectId
from werkzeug.utils import secure_filename
from twilio.rest import Client
from utils.hazard_mapping import ROLE_ALERT_MAPPING, ROLE_RADIUS, ROLE_TO_TYPES
from utils.authority_alert import find_authorities_nearby
from bson import ObjectId

from pymongo import GEOSPHERE
import requests
import os
import uuid
from bson.errors import InvalidId


alerts_bp = Blueprint("alerts", __name__)
UPLOAD_FOLDER = os.path.join(os.getcwd(), "static", "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def reverse_geocode(lat, lon):
    try:
        res = requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={
                "format": "json",
                "lat": lat,
                "lon": lon,
                "zoom": 10,      # city/town level
                "addressdetails": 1
            },
            headers={"User-Agent": "disaster-chatbot"}
        )
        if res.ok:
            data = res.json()
            address = data.get("address", {})
            # Try multiple levels
            return address.get("city") or address.get("town") or address.get("village") or address.get("suburb") or "Unknown"
        return "Unknown"
    except Exception as e:
        print(f"Reverse geocoding failed: {e}")
        return "Unknown"



# ✅ POST /report — Submit a new alert
@alerts_bp.route("/report", methods=["POST"])
def report_alert():
    try:
        db = current_app.db
        socketio = current_app.socketio
        data = request.form.to_dict()
        file = request.files.get("file")

        lat = float(data.get("latitude", 0))
        lon = float(data.get("longitude", 0))
        alert_type = data.get("type", "").strip().lower()

        data.update({
            "latitude": lat,
            "longitude": lon,
            "location": {"type": "Point", "coordinates": [lon, lat]},
            "location_text": reverse_geocode(lat, lon),
            "type": alert_type,
            "status": "live",
            "resolved": False,
            "timestamp": datetime.utcnow()
        })

        # File handling
        if file:
            ext = os.path.splitext(file.filename)[1]
            unique_name = f"{uuid.uuid4().hex}{ext}"
            file_path = os.path.join(UPLOAD_FOLDER, unique_name)
            file.save(file_path)
            data["file_url"] = f"/static/uploads/{unique_name}"
            data["file_type"] = "image" if ext.lower() in [".jpg", ".jpeg", ".png"] else "video"

        # Notify nearby authorities
        role_required = ROLE_ALERT_MAPPING.get(alert_type)
        if role_required:
            nearby_authorities = find_authorities_nearby(alert_type, [lon, lat])
            print("Nearby authorities returned:", [str(a['_id']) for a in nearby_authorities])

            if not nearby_authorities:
                nearby_authorities = list(current_app.db.authorities.find({"role": role_required}))

        data["notified_authorities"] = [str(a["_id"]) for a in nearby_authorities]
        print("Final notified_authorities:", data["notified_authorities"])

        result = db.report.insert_one(data)
        
        


        socketio.emit("new_alert", {"_id": str(result.inserted_id), **data})

        return jsonify({"message": "Alert reported successfully"}), 201

    except Exception as e:
        print(f"Error in report_alert: {e}")
        return jsonify({"error": "Failed to report alert"}), 500

# ✅ GET /alerts/feed — Latest public alerts
@alerts_bp.route("/feed", methods=["GET"])
def alerts_feed():
    try:
        db = current_app.db
        alerts = list(db.report.find().sort("timestamp", -1).limit(50))
        for alert in alerts:
            alert["_id"] = str(alert["_id"])
            ts = alert.get("timestamp", datetime.utcnow())
            alert["timestamp"] = ts.isoformat() if isinstance(ts, datetime) else str(ts)

            # Attach media preview
            url = alert.get("file_url", "")
            if url:
                url = url.replace("\\", "/")
                if alert.get("file_type") == "image":
                    alert["imageUrl"] = url
                elif alert.get("file_type") == "video":
                    alert["videoUrl"] = url

        return jsonify(alerts), 200

    except Exception as e:
        print(f"Error fetching alert feed: {e}")
        return jsonify({"error": "Could not fetch alerts"}), 500

# ✅ GET /api/alerts/alerts — Live alerts for authority map
@alerts_bp.route("/", methods=["GET"])
def get_authority_alerts():
    try:
        db = current_app.db
        report = db.report
        auth = db.authorities

        role = request.args.get("role", "").lower()
        auth_id = request.args.get("auth_id", "").strip()
        lat = lon = None

        # 1️⃣ Try fetching coordinates from authority document
        if auth_id:
            authority = auth.find_one({"_id": ObjectId(auth_id)})
            coords = authority.get("location", {}).get("coordinates", [])
            if isinstance(coords, list) and len(coords) == 2:
                lon, lat = float(coords[0]), float(coords[1])
            else:
                return jsonify({"error": "Invalid/missing coordinates in authority"}), 400
        else:
            # 2️⃣ Otherwise use query parameters
            try:
                lat = float(request.args.get("lat"))
                lon = float(request.args.get("lon"))
            except:
                return jsonify({"error": "Missing lat/lon"}), 400

        radius = ROLE_RADIUS.get(role, 10) * 1000
        types = ROLE_TO_TYPES.get(role, [])

        query = {
            "location": {
                "$near": {
                    "$geometry": {"type": "Point", "coordinates": [lon, lat]},
                    "$maxDistance": radius,
                }
            },
            "status": "live",
        }

        if types:
            query["type"] = {"$in": types}
        print("Running query:", query)
        print("Role:", role)
        print("lat/lon:", lat, lon)
        results = list(report.find(query).sort("timestamp", -1))
        for alert in results:
            alert["_id"] = str(alert["_id"])
            created = alert.get("created_at")
            if isinstance(created, datetime):
                alert["created_at"] = created.isoformat()
            else:
                alert["created_at"] = str(created)

            url = alert.get("file_url", "")
            if url:
                url = url.replace("\\", "/")
                if alert.get("file_type") == "image":
                    alert["imageUrl"] = url
                elif alert.get("file_type") == "video":
                    alert["videoUrl"] = url

        return jsonify(results), 200

    except Exception as e:
        print(f"[ERROR] get_authority_alerts: {e}")
        return jsonify({"error": "Failed to fetch alerts"}), 500

# ✅ PATCH /<alert_id>/resolve — Mark alert as resolved
@alerts_bp.route("/<alert_id>/resolve", methods=["PATCH"])
def resolve_alert(alert_id):
    try:
        db = current_app.db
        report = db.report

        try:
            obj_id = ObjectId(alert_id)
        except InvalidId:
            return jsonify({"error": "Invalid alert ID"}), 400

        result = report.update_one(
            {"_id": obj_id},
            {"$set": {
                "status": "resolved",
                "resolved": True,
                "resolved_at": datetime.utcnow()
            }}
        )

        if result.modified_count == 1:
            return jsonify({"message": "Alert marked as resolved"}), 200
        return jsonify({"error": "Alert not found"}), 404

    except Exception as e:
        print("Error resolving alert:", e)
        return jsonify({"error": "Failed to resolve alert"}), 500
# ✅ PATCH /help/<alert_id> — Send help SMS
@alerts_bp.route("/help/<alert_id>", methods=["PATCH"])
def send_help(alert_id):
    try:
        db = current_app.db
        socketio = current_app.socketio
        report = db.report
        authorities = db.authorities

        alert = report.find_one({"_id": ObjectId(alert_id)})
        if not alert:
            return jsonify({"error": "Alert not found"}), 404

        alert_type = alert.get("type")
        lat = alert.get("latitude")
        lon = alert.get("longitude")
        location = [lon, lat]

        role = ROLE_ALERT_MAPPING.get(alert_type)
        if not role:
            return jsonify({"error": "No role mapping found for alert type"}), 400

        # Find nearby authorities of that role
        nearby_authorities = list(authorities.find({
            "role": role,
            "location": {
                "$near": {
                    "$geometry": {"type": "Point", "coordinates": location},
                    "$maxDistance": ROLE_RADIUS.get(role, 10) * 1000
                }
            }
        }))

        # Emit socket message to each nearby authority (they will filter by role on frontend)
        for auth in nearby_authorities:
            socketio.emit("help_requested", {
                "alert_id": str(alert["_id"]),
                "type": alert_type,
                "location_text": alert.get("location_text", "Unknown"),
                "lat": lat,
                "lon": lon,
                "authority_id": str(auth["_id"]),
                "authority_role": role,
            })

        # Optional: Notify the citizen who reported
        contact = alert.get("contact")
        if contact:
            msg = f"🚨 Help is on the way for your '{alert_type}' report at {alert.get('location_text')}."
            send_twilio_alert(contact, msg)

        # Mark alert as help sent
        report.update_one({"_id": ObjectId(alert_id)}, {"$set": {"help_sent": True}})

        return jsonify({"message": "Help dispatched to nearby authorities"}), 200

    except Exception as e:
        print(f"Error in send_help: {e}")
        return jsonify({"error": "Failed to send help"}), 500

# ✅ GET /resolved — Fetch resolved alerts
@alerts_bp.route("/resolved", methods=["GET"])
def get_resolved_alerts():
    try:
        db = current_app.db
        report = db.report
        role = request.args.get("role", "").lower()
        lat = float(request.args.get("lat", 0))
        lon = float(request.args.get("lon", 0))

        query = {
            "status": "resolved",
            "type": {"$in": ROLE_TO_TYPES.get(role, [])},
            "location": {
                "$near": {
                    "$geometry": {"type": "Point", "coordinates": [lon, lat]},
                    "$maxDistance": ROLE_RADIUS.get(role, 15) * 1000
                }
            }
        }

        results = list(report.find(query).limit(50))
        for alert in results:
            alert["_id"] = str(alert["_id"])
            alert["timestamp"] = alert.get("timestamp", datetime.utcnow()).isoformat()

        return jsonify(results), 200

    except Exception as e:
        print("Error fetching resolved alerts:", e)
        return jsonify({"error": "Could not fetch resolved alerts"}), 500

# ✅ GET /static/uploads/<filename>
@alerts_bp.route("/static/uploads/<filename>")
def serve_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

# ✅ Utility: Twilio SMS Sender
def send_twilio_alert(to_number, body):
    try:
        client = Client(
            os.getenv("TWILIO_ACCOUNT_SID"),
            os.getenv("TWILIO_AUTH_TOKEN")
        )
        client.messages.create(
            body=body,
            from_=os.getenv("TWILIO_PHONE_NUMBER"),
            to=to_number
        )
    except Exception as e:
        print(f"Twilio SMS failed: {e}")

# alerts_bp.py or similar
@alerts_bp.route("/send-alert", methods=["POST"])
def send_alert():
    data = request.json
    title = data.get("title")
    message = data.get("message")
    pincode = data.get("pincode")
    medium = data.get("medium", "sms")

    if not (title and message and pincode):
        return jsonify({"error": "Missing required fields"}), 400

    # fetch users by pincode and send via Twilio or WhatsApp
    # ...

    return jsonify({"message": f"Alert sent via {medium} to pincode {pincode}."}), 200

# ✅ GET /api/alerts/all — Fetch all alerts for a specific authority
@alerts_bp.route("/all", methods=["GET"])
def get_all_alerts():
    try:
        db = current_app.db
        report = db.report
        auth_id = request.args.get("auth_id")  # must be the logged-in authority's _id
        role = request.args.get("role")  # optional role filter

        query = {}
        if auth_id:
            query["notified_authorities"] = {"$in": [str(auth_id)]}
        if role:
            alert_types = ROLE_TO_TYPES.get(role.lower(), [])
            if alert_types:
                query["type"] = {"$in": alert_types}

        all_alerts = list(report.find(query).sort("timestamp", -1))

        for a in all_alerts:
            a["_id"] = str(a["_id"])
            ts = a.get("timestamp")
            a["timestamp"] = ts.isoformat() if isinstance(ts, datetime) else ts or datetime.utcnow().isoformat()
            if "file_url" in a:
                a["file_url"] = a["file_url"].replace("\\", "/")

        return jsonify(all_alerts), 200

    except Exception as e:
        import traceback
        print("Error fetching alerts:", traceback.format_exc())
        return jsonify({"error": "Failed to fetch alerts"}), 500
