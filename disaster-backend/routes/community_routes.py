# routes/community_routes.py
from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
from twilio.rest import Client
import os

community_bp = Blueprint("community", __name__)

@community_bp.route("/signup", methods=["POST"])
def community_signup():
    db = current_app.db
    data = request.get_json()

    name = data.get("name")
    phone = data.get("phone")
    district = data.get("district")  # ✅ renamed for clarity
    latitude = data.get("latitude")
    longitude = data.get("longitude")

    if not all([name, phone, district, latitude, longitude]):
        return jsonify({"error": "All fields including location are required"}), 400

    # ✅ Prevent duplicate signups by phone
    existing = db.community_users.find_one({"phone": phone})
    if existing:
        return jsonify({"error": "Phone number already registered"}), 400

    try:
        latitude = float(latitude)
        longitude = float(longitude)
    except ValueError:
        return jsonify({"error": "Invalid latitude/longitude"}), 400

    user = {
        "name": name,
        "phone": phone,
        "district": district,
        "latitude": latitude,
        "longitude": longitude,
        "timestamp": datetime.utcnow()
    }

    db.community_users.insert_one(user)

    # ✅ Send confirmation SMS (non-blocking)
    try:
        account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
        auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
        from_number = os.environ.get("TWILIO_PHONE_NUMBER")

        if account_sid and auth_token and from_number:
            client = Client(account_sid, auth_token)
            client.messages.create(
                body=f"Hi {name}, you've been subscribed for community alerts in {district}. Stay safe!",
                from_=from_number,
                to=phone
            )
    except Exception as e:
        print("Twilio error:", e)

    return jsonify({"message": "Signup successful"}), 200


@community_bp.route("/users", methods=["GET"])
def get_community_users():
    db = current_app.db
    users = list(db.community_users.find())
    
    for u in users:
        u["_id"] = str(u["_id"])
        u["timestamp"] = u["timestamp"].isoformat()

    return jsonify(users)
