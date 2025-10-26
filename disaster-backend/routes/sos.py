from flask import Blueprint, request, jsonify, current_app
from flask_cors import cross_origin
from datetime import datetime
from bson import ObjectId

sos_bp = Blueprint("sos_bp", __name__, url_prefix="/api")

def clean_mongo(data):
    """Recursively convert ObjectId to str in dicts/lists"""
    if isinstance(data, dict):
        return {k: clean_mongo(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [clean_mongo(v) for v in data]
    elif isinstance(data, ObjectId):
        return str(data)
    return data
@sos_bp.route("/sos", methods=["POST"])
@cross_origin()
def send_sos():
    try:
        db = current_app.db
        data = request.get_json()

        name = data.get("name", "Unknown User")
        contact = data.get("contact", "N/A")
        lat = float(data.get("latitude")) if data.get("latitude") else None
        lng = float(data.get("longitude")) if data.get("longitude") else None
        description = data.get("description", "SOS emergency")

        sos_alert = {
            "name": name,
            "contact": contact,
            "type": "SOS",
            "description": description,
            "latitude": lat,
            "longitude": lng,
            "location": {"type": "Point", "coordinates": [lng, lat]} if lat and lng else None,
            "location_text": "Unknown",
            "severity": "High",
            "timestamp": datetime.utcnow().isoformat(),
            "status": "live",
            "file_url": None,
            "file_type": None,
            "notified_authorities": []
        }

        # Save to DB
        result = db.sos_alerts.insert_one(sos_alert)

        # Minimal payload for frontend
        safe_alert = {
            "_id": str(result.inserted_id),
            "name": name,
            "contact": contact,
            "latitude": lat,
            "longitude": lng
        }

        # Emit realtime update
        socketio = current_app.socketio
        socketio.emit("new_sos", safe_alert)

        return jsonify({
            "success": True,
            "message": "SOS sent & logged",
            "id": str(result.inserted_id)
        }), 201

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500
