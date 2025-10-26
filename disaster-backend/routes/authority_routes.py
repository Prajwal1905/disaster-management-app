from flask import Blueprint, request, jsonify
from models.authority_model import authorities
from bson import ObjectId, Regex
import base64
import os
from datetime import datetime
import traceback
from deepface import DeepFace
from PIL import Image
from io import BytesIO
from werkzeug.security import generate_password_hash, check_password_hash

authorities.create_index([("location", "2dsphere")])


authority_bp = Blueprint("authority", __name__)

# Register authority
@authority_bp.route("/api/register-authority", methods=["POST"])
def register_authority():
    try:
        data = request.json
        required_fields = ["name", "age", "gender", "role", "district", "email", "phone", "location", "faceImage", "password"]

        if not all(field in data for field in required_fields):
            return jsonify({"error": "Missing fields"}), 400

        image_data = data["faceImage"]
        if not image_data or "," not in image_data:
            return jsonify({"error": "Invalid or missing face image"}), 400

        try:
            _, base64_data = image_data.split(",", 1)
            image_bytes = base64.b64decode(base64_data)
        except Exception as decode_err:
            return jsonify({"error": f"Image decoding failed: {str(decode_err)}"}), 400

        face_path = f"uploads/faces/{data['email']}_{datetime.utcnow().timestamp()}.png"
        os.makedirs(os.path.dirname(face_path), exist_ok=True)
        with open(face_path, "wb") as f:
            f.write(image_bytes)

        # ✅ Hash the password
        hashed_password = generate_password_hash(data["password"])
        coordinates = data["location"].get("coordinates")
        if not coordinates or len(coordinates) != 2:
            return jsonify({"error": "Location coordinates are missing"}), 400

        lng, lat = coordinates

        authority = {
            "name": data["name"],
            "age": data["age"],
            "gender": data["gender"],
            "role": data["role"].strip().lower(),
            "district": data["district"],
            "email": data["email"],
            "phone": data["phone"],
            "location": {
                "type": "Point",
                "coordinates": [lng, lat]
            },


            "face_path": face_path,
            "password": hashed_password,  # ✅ Securely stored hash
            "created_at": datetime.utcnow()
        }

        authorities.insert_one(authority)
        return jsonify({"message": "Authority registered successfully"}), 201

    except Exception as e:
        print("Error during authority registration:", traceback.format_exc())
        return jsonify({"error": "Internal server error"}), 500
# Get all authorities with pagination + search
@authority_bp.route("/api/authorities", methods=["GET"])
def get_authorities():
    try:
        query = {}
        role = request.args.get("role")
        district = request.args.get("district")
        search = request.args.get("search", "")
        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 10))
        skip = (page - 1) * limit

        # Filtering by role and district
        if role:
            query["role"] = role
        if district:
            query["district"] = district

        # Search by name, phone, or email
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"phone": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
            ]

        # Total count for pagination
        total = authorities.count_documents(query)

        # Paginated fetch
        all_authorities = list(
            authorities.find(query).skip(skip).limit(limit)
        )

        # Sanitize each authority object
        for a in all_authorities:
            a["_id"] = str(a["_id"])
            a.pop("face_path", None)

        return jsonify({
            "data": all_authorities,
            "total": total,
            "page": page,
            "limit": limit,
            "totalPages": (total + limit - 1) // limit
        })

    except Exception as e:
        import traceback
        print("Error during authority fetch:", traceback.format_exc())
        return jsonify({"error": "Internal server error"}), 500

# Delete authority
@authority_bp.route("/api/authority/<id>", methods=["DELETE"])
def delete_authority(id):
    result = authorities.delete_one({"_id": ObjectId(id)})
    return jsonify({"message": "Deleted" if result.deleted_count else "Not Found"}), 200

# Update authority
@authority_bp.route("/api/authority/<id>", methods=["PUT"])
def update_authority(id):
    data = request.json
    update_fields = ["name", "age", "gender", "role", "district", "phone", "location"]
    update = {k: v for k, v in data.items() if k in update_fields}
    authorities.update_one({"_id": ObjectId(id)}, {"$set": update})
    return jsonify({"message": "Updated"}), 200

@authority_bp.route("/api/authority-login", methods=["POST"])
def authority_login():
    try:
        data = request.json
        email = data.get("email")
        password = data.get("password")
        face_image = data.get("faceImage")  # optional

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        authority = authorities.find_one({"email": email})
        if not authority:
            return jsonify({"error": "Authority not found"}), 404

        if not check_password_hash(authority["password"], password):
            return jsonify({"error": "Incorrect password"}), 401

        # ✅ Optional face verification
        if face_image and "," in face_image:
            try:
                _, base64_data = face_image.split(",", 1)
                image_bytes = base64.b64decode(base64_data)

                temp_path = f"temp_faces/temp_{email}_{datetime.utcnow().timestamp()}.png"
                os.makedirs(os.path.dirname(temp_path), exist_ok=True)
                with open(temp_path, "wb") as f:
                    f.write(image_bytes)

                result = DeepFace.verify(
                    img1_path=authority["face_path"],
                    img2_path=temp_path,
                    enforce_detection=False
                )

                os.remove(temp_path)

                if not result.get("verified"):
                    return jsonify({"error": "Face verification failed"}), 403

            except Exception as face_err:
                return jsonify({"error": f"Face verification error: {str(face_err)}"}), 500

        # ✅ Role-based redirection
        role = authority.get("role", "").lower()

        role_redirect_map = {
           "police_services": "/authority/dashboard",
           "fire_services": "/authority/dashboard",
           "medical_services": "/authority/dashboard",
           "disaster_relief": "/authority/dashboard"
        }


        redirect_url = role_redirect_map.get(role, "/dashboard/general")

        return jsonify({
            "message": "Login successful",
            "redirect_url": redirect_url,
            "authority": {
                "name": authority["name"],
                "email": authority["email"],
                "role": authority["role"],
                "district": authority["district"],
                "_id": str(authority["_id"]),
                "location": {
                    "lat": authority["location"]["coordinates"][1],
                    "lng": authority["location"]["coordinates"][0]
                } if authority.get("location") and isinstance(authority["location"].get("coordinates"), list) and len(authority["location"]["coordinates"]) == 2 else {},
                "phone": authority["phone"]


            }
        }), 200

    except Exception as e:
        print("Login error:", traceback.format_exc())
        return jsonify({"error": "Internal server error"}), 500


@authority_bp.route("/api/districts", methods=["GET"])
def get_available_districts():
    all_authorities = authorities.find({}, {"district": 1})
    districts = sorted({auth["district"] for auth in all_authorities if "district" in auth})
    return jsonify(districts)

# ✅ Get all authority locations (for map rendering)
@authority_bp.route("/api/authority-locations", methods=["GET"])
def get_authority_locations():
    try:
        role = request.args.get("role")
        query = {}
        if role:
            query["role"]=role

        all_auths = list(authorities.find(query, {
            "name": 1,
            "role": 1,
            "email": 1,
            "phone": 1,
            "location": 1,
        }))

        result = []
        for auth in all_auths:
            coords = auth.get("location", {}).get("coordinates", [])
            if len(coords) == 2:
                result.append({
                    "_id": str(auth["_id"]),
                    "name": auth.get("name", "Unknown"),
                    "role": auth.get("role", "Unknown"),
                    "email": auth.get("email"),
                    "phone": auth.get("phone"),
                    "lng": coords[0],
                    "lat": coords[1]
                })

        return jsonify(result), 200

    except Exception as e:
        import traceback
        print("Error in get_authority_locations:", traceback.format_exc())
        return jsonify({"error": "Failed to fetch locations"}), 500

