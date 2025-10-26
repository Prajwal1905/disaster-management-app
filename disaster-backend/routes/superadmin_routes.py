# backend/routes/superadmin_routes.py

from flask import Blueprint, request, jsonify
from pymongo import MongoClient
from bson import ObjectId
from werkzeug.security import generate_password_hash
import os
from datetime import datetime, timedelta
from twilio.rest import Client
from flask_jwt_extended import jwt_required, create_access_token




superadmin_routes = Blueprint("superadmin", __name__)

client = MongoClient(os.getenv("MONGO_URI", "mongodb://localhost:27017"))
db = client["disaster_app"]
authority_col = db["authorities"]
alerts_col = db["alerts"]            # ⚠️ You don’t have this collection yet
community_col = db["community_users"]
report_col = db["report"]



@superadmin_routes.route("/api/superadmin/authorities", methods=["GET"])
def get_all_authorities():
    authorities = list(authority_col.find({}, {"password": 0}))
    for auth in authorities:
        auth["_id"] = str(auth["_id"])
    return jsonify(authorities)

@superadmin_routes.route("/api/superadmin/authorities", methods=["POST"])
def create_authority():
    data = request.json
    data["password"] = generate_password_hash(data["password"])
    authority_col.insert_one(data)
    return jsonify({"message": "Authority created."}), 201

@superadmin_routes.route("/api/superadmin/authorities/<id>", methods=["PUT"])
def update_authority(id):
    data = request.json
    update_data = {
        "name": data["name"],
        "email": data["email"]
    }
    if data.get("password"):
        update_data["password"] = generate_password_hash(data["password"])
    authority_col.update_one({"_id": ObjectId(id)}, {"$set": update_data})
    return jsonify({"message": "Authority updated."})

@superadmin_routes.route("/api/superadmin/authorities/<id>", methods=["DELETE"])
def delete_authority(id):
    authority_col.delete_one({"_id": ObjectId(id)})
    return jsonify({"message": "Authority deleted."})

@superadmin_routes.route("/api/superadmin/send-alert", methods=["POST"])
def send_public_alert():
    data = request.json

    # Validation
    required_fields = ["title", "message", "type", "district"]
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required alert fields."}), 400

    alert = {
        "title": data["title"],
        "message": data["message"],
        "type": data["type"],
        "district": data["district"],
        "timestamp": datetime.utcnow().isoformat(),
        "status": "active"
    }

    # Save alert to database
    alerts_col.insert_one(alert)

    # Get community users for the district
    community_col = db["community"]
    matching_users = list(community_col.find({"district": data["district"]}))

    # Twilio setup
    TWILIO_SID = os.getenv("TWILIO_ACCOUNT_SID")
    TWILIO_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
    TWILIO_PHONE = os.getenv("TWILIO_PHONE_NUMBER")
    client = Client(TWILIO_SID, TWILIO_TOKEN)

    success_count = 0
    failed_numbers = []

    for user in matching_users:
        phone = user.get("phone")
        if not phone:
            continue
        print("Sending SMS to:", phone)
        try:
            message = client.messages.create(
                body=f"🚨 {data['type']} Alert: {data['message']}",
                from_=TWILIO_PHONE,
                to=phone
            )
            print(f"✅ Sent to {phone}, SID: {message.sid}")
            success_count += 1
        except Exception as e:
            print(f"❌ Failed to send alert to {phone}: {e}")
            failed_numbers.append(phone)

    return jsonify({
        "message": "Public alert sent (see console for Twilio SID).",
        "sent_count": success_count,
        "failed_numbers": failed_numbers
    }), 201


@superadmin_routes.route("/api/superadmin/alerts", methods=["GET"])
def get_all_alerts():
    status = request.args.get("status")  # e.g., "active"
    pincode = request.args.get("pincode")

    query = {}
    if status:
        query["status"] = status
    if pincode:
        query["location.pincode"] = pincode  # assuming location includes pincode

    alerts = list(alerts_col.find(query).sort("timestamp", -1))
    for alert in alerts:
        alert["_id"] = str(alert["_id"])
    return jsonify(alerts), 200

@superadmin_routes.route("/api/superadmin/alerts/<alert_id>", methods=["DELETE"])
def delete_alert(alert_id):
    result = alerts_col.delete_one({"_id": ObjectId(alert_id)})
    if result.deleted_count:
        return jsonify({"message": "Alert deleted."}), 200
    return jsonify({"error": "Alert not found."}), 404


@superadmin_routes.route("/api/superadmin/alerts/<alert_id>/resolve", methods=["PATCH"])
def resolve_alert(alert_id):
    result = alerts_col.update_one({"_id": ObjectId(alert_id)}, {"$set": {"status": "resolved"}})
    if result.modified_count:
        return jsonify({"message": "Alert marked as resolved."}), 200
    return jsonify({"error": "Alert not found or already resolved."}), 404

@superadmin_routes.route("/api/superadmin/users")
def get_users():
    users = list(db["community"].find({}, {"_id": 0}))
    return jsonify(users)


