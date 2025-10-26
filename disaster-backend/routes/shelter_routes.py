from flask import Blueprint, request, jsonify
from pymongo import MongoClient
from bson.objectid import ObjectId
import os
from dotenv import load_dotenv
import requests
from werkzeug.utils import secure_filename

from flask_jwt_extended import jwt_required, get_jwt_identity

from datetime import datetime
load_dotenv()

shelter_bp = Blueprint('shelter', __name__)

# MongoDB setup
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)
db = client["disaster_app"]
shelters_collection = db["shelters"]
shelters_applications = db["shelter_applications"]

# Function to reverse geocode lat/lng to address (OpenStreetMap Nominatim)
def reverse_geocode(lat, lon):
    try:
        res = requests.get(
            f"https://nominatim.openstreetmap.org/reverse",
            params={"lat": lat, "lon": lon, "format": "json"},
            headers={"User-Agent": "disaster-app"}
        )
        if res.status_code == 200:
            return res.json().get("display_name", "Unknown Location")
    except Exception as e:
        print("Geocoding error:", e)
    return "Unknown Location"

@shelter_bp.route('/', methods=['GET'])
def get_all_shelters():
    approved = list(shelters_collection.find())
    pending = list(shelters_applications.find())

    normalized = []

    for shelter in approved:
        shelter["_id"] = str(shelter["_id"])
        # Coordinates are already flat
        normalized.append(shelter)

    for shelter in pending:
        shelter["_id"] = str(shelter["_id"])
        # Flatten the coordinates from nested location
        loc = shelter.get("location", {})
        shelter["latitude"] = loc.get("latitude")
        shelter["longitude"] = loc.get("longitude")
        normalized.append(shelter)

    return jsonify(normalized), 200



@shelter_bp.route('/pending', methods=['GET'])
def get_pending_shelters():
    shelters = list(shelters_applications.find({"status": "pending"}))
    for s in shelters:
        s["_id"] = str(s["_id"])
    return jsonify(shelters), 200

# PATCH approve/reject
@shelter_bp.route('/<id>/status', methods=['PATCH'])
@jwt_required()
def update_shelter_status(id):
    current_user = get_jwt_identity()

    if current_user!= "superadmin":
        return jsonify({"error": "Unauthorized"}), 403

    try:
        data = request.get_json(force=True)
        print("Parsed JSON:", data)
    except Exception as e:
        print("JSON parsing error:", str(e))
        return jsonify({"error": "Invalid JSON"}), 400
    
    if not data:
        return jsonify({"error": "Missing JSON body"}), 400
    
    new_status = data.get("status")

    if new_status not in ["approved", "rejected"]:
        print("New status received:", new_status)

        return jsonify({"error": "Invalid status"}), 422

    try:
        object_id = ObjectId(id)
    except:
        return jsonify({"error": "Invalid ID"}), 400

    # Check application first
    application = db.shelter_applications.find_one({"_id": object_id})
    if application:
        if new_status == "approved":
            shelter_data = {
                "name": application.get("orgName"),
                "address": application.get("address"),
                "contact": application.get("contact"),
                "capacity": int(application.get("capacity", 0)),
                "latitude": application["location"]["latitude"],
                "longitude": application["location"]["longitude"],
                "description": application.get("description", "No description"),
                "file": application.get("file"),
                "status": "approved"
            }
            print("Final shelter_data going to insert:", shelter_data)
            db.shelters.insert_one(shelter_data)
            db.shelter_applications.delete_one({"_id": object_id})
            return jsonify({"message": "Shelter approved and added"}), 200

        elif new_status == "rejected":
            db.shelter_applications.delete_one({"_id": object_id})
            return jsonify({"message": "Shelter request rejected and removed"}), 200

    result = db.shelters.update_one(
        {"_id": object_id},
        {"$set": {"status": new_status}}
    )

    if result.modified_count > 0:
        return jsonify({"message": f"Shelter {new_status}."}), 200

    return jsonify({"error": "Shelter not found"}), 404



# POST new shelter
@shelter_bp.route('/', methods=['POST'])
def add_shelter():
    data = request.json
    required_fields = ['name', 'latitude', 'longitude', 'capacity', 'contact']

    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing fields"}), 400

    # Auto-fill address if not provided
    if 'address' not in data or not data['address'].strip():
        data['address'] = reverse_geocode(data['latitude'], data['longitude'])

    # Ensure the shelter is marked as approved if not explicitly set
    data["status"] = data.get("status", "approved")

    result = shelters_collection.insert_one(data)
    return jsonify({"message": "Shelter added", "id": str(result.inserted_id)}), 201


# PUT update shelter
@shelter_bp.route('/<id>', methods=['PUT'])
def update_shelter(id):
    data = request.json
    update_result = shelters_collection.update_one({'_id': ObjectId(id)}, {'$set': data})
    if update_result.matched_count == 0:
        return jsonify({"error": "Shelter not found"}), 404
    return jsonify({"message": "Shelter updated"}), 200

# DELETE shelter
@shelter_bp.route('/<id>', methods=['DELETE'])
def delete_shelter(id):
    delete_result = shelters_collection.delete_one({'_id': ObjectId(id)})
    if delete_result.deleted_count == 0:
        return jsonify({"error": "Shelter not found"}), 404
    return jsonify({"message": "Shelter deleted"}), 200

# 📩 POST - Shelter application route (for NGOs/orgs)
@shelter_bp.route('/shelter-application', methods=['POST'])
def apply_shelter():
    form = request.form
    file = request.files.get('file')

    required_fields = ['orgName', 'email', 'contact', 'description', 'capacity', 'lat', 'lng']
    if not all(field in form for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    # Handle optional address
    address = form.get('address')
    if not address:
        lat = float(form['lat'])
        lng = float(form['lng'])
        address = reverse_geocode(lat, lng)
    else:
        lat = float(form['lat'])
        lng = float(form['lng'])

    UPLOAD_FOLDER = os.path.join("static", "uploads")
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)

    # Save file (optional)
    filename = None
    if file:
        filename = secure_filename(file.filename)
        file.save(os.path.join(UPLOAD_FOLDER, filename))


    # Construct document
    data = {
        "orgName": form['orgName'],
        "email": form['email'],
        "contact": form['contact'],
        "description": form['description'],
        "capacity": form['capacity'],
        "address": address,
        "location": {"latitude": lat, "longitude": lng},
        "status": "pending",
        "role": "shelter_application",
        "timestamp": datetime.utcnow(),
        "file": filename
    }

    result = db.shelter_applications.insert_one(data)
    return jsonify({"message": "Application submitted", "id": str(result.inserted_id)}), 201