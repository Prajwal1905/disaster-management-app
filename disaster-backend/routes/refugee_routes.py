import os
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
from datetime import datetime
from pymongo import MongoClient

refugee_bp = Blueprint("refugee", __name__)
client = MongoClient("mongodb://localhost:27017/")
db = client["disaster_app"]

UPLOAD_FOLDER = "static/uploads/refugees"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "mp4", "mov", "avi"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

@refugee_bp.route("/api/refugee-help", methods=["POST"])
def refugee_help():
    try:
        name = request.form.get("name")
        contact = request.form.get("contact")
        description = request.form.get("description")
        address = request.form.get("address", "")
        latitude = request.form.get("latitude")
        longitude = request.form.get("longitude")
        timestamp = datetime.utcnow()

        if not (name and contact and description):
            return jsonify({"error": "Missing required fields"}), 400

        # Handle optional media file
        file_url = None
        if "media" in request.files:
            file = request.files["media"]
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                os.makedirs(UPLOAD_FOLDER, exist_ok=True)
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                file.save(filepath)
                file_url = f"/{filepath}"

        # Save to MongoDB
        db.refugee_requests.insert_one({
            "name": name,
            "contact": contact,
            "description": description,
            "address": address,
            "location": {
                "latitude": float(latitude) if latitude else None,
                "longitude": float(longitude) if longitude else None
            },
            "file_url": file_url,
            "timestamp": timestamp,
            "status": "pending"  # Superadmin can update this later
        })

        return jsonify({"message": "✅ Refugee help request submitted"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@refugee_bp.route("/api/refugee-requests", methods=["GET"])
def get_refugee_requests():
    requests_list = []
    for r in db.refugee_requests.find().sort("timestamp", -1):
        r["_id"] = str(r["_id"])
        requests_list.append(r)
    return jsonify(requests_list)
