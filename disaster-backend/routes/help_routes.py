from flask import Blueprint, request, jsonify, current_app
from bson import ObjectId
import json
from math import radians, sin, cos, sqrt, atan2
from geopy.distance import geodesic
from datetime import datetime,timedelta
import jwt
from flask_jwt_extended import jwt_required, get_jwt_identity

help_assist_bp = Blueprint("help_assist", __name__)

# -----------------------------
# Help Assistance Registration
# -----------------------------
@help_assist_bp.route("/api/help_assist/register", methods=["POST"])
def register_help_assist():
    db = current_app.db

    org_name = request.form.get("orgName")
    username = request.form.get("username")
    email = request.form.get("email")
    password = request.form.get("password")
    contact_info = request.form.get("contactInfo")
    address = request.form.get("address")
    description = request.form.get("description")
    location_raw = request.form.get("location")
    
    try:
        location = json.loads(location_raw) if location_raw else {}
    except Exception as e:
        return jsonify({"error": "Invalid location format", "details": str(e)}), 400

    required_fields = [org_name, username, email, password, contact_info, address, location]
    if not all(required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    if db.help_assist_users.find_one({"username": username}):
        return jsonify({"error": "Username already exists"}), 409

    # Image handling (optional)
    image_file = request.files.get("image")
    image_url = None
    if image_file:
        # Save image or upload to cloud storage
        # For now just get filename
        image_url = image_file.filename

    data = {
        "orgName": org_name,
        "username": username,
        "email": email,
        "password": password,
        "contactInfo": contact_info,
        "address": address,
        "description": description,
        "location": location,
        "image": image_url,
        "status": "pending",
        "role": "help_assist"
    }

    db.help_assist_users.insert_one(data)
    return jsonify({"message": "Help Assistance registration successful. Awaiting approval."}), 201

@help_assist_bp.route("/api/help_assist/profile", methods=["GET"])
def get_help_assist_profile():
    email = request.args.get("email")
    if not email:
        return jsonify({"error": "Email query param required"}), 400

    db = current_app.db
    user = db.help_assist_users.find_one({"email": email})

    if not user:
        return jsonify({"error": "User not found"}), 404

    user["_id"] = str(user["_id"])

    # Exclude password in response for security
    user.pop("password", None)

    return jsonify(user), 200

@help_assist_bp.route("/api/help_assist/profile", methods=["PATCH"])
def update_help_assist_profile():
    db = current_app.db

    data = request.json
    email = data.get("email")  # required to identify user

    if not email:
        return jsonify({"error": "Email is required"}), 400

    # Fetch user first
    user = db.help_assist_users.find_one({"email": email})
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Allowed editable fields
    editable_fields = [
        "orgName",
        "contactInfo",
        "address",
        "description",
        "location",
        # You can allow changing password here but handle carefully
    ]

    update_data = {}

    for field in editable_fields:
        if field in data:
            update_data[field] = data[field]

    if not update_data:
        return jsonify({"error": "No valid fields to update"}), 400

    # Update DB
    db.help_assist_users.update_one(
        {"email": email},
        {"$set": update_data}
    )

    # Return updated profile without password
    updated_user = db.help_assist_users.find_one({"email": email})
    updated_user["_id"] = str(updated_user["_id"])
    updated_user.pop("password", None)

    return jsonify({"message": "Profile updated successfully", "profile": updated_user}), 200

@help_assist_bp.route("/api/help_assist/login", methods=["POST"])
def help_assist_login():
    db = current_app.db
    data = request.json

    username = data.get("username")
    password = data.get("password")

    user = db.help_assist_users.find_one({"username": username, "password": password})
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401
    if user["status"] == "pending":
        return jsonify({"error": "Your registration is under review."}), 403
    if user["status"] == "rejected":
        return jsonify({"error": "Your registration was rejected."}), 403
    payload = {
        "email": user["email"],
        "exp": datetime.utcnow() + timedelta(days=1)  # expires in 1 day
    }
    token = jwt.encode(payload, current_app.config["JWT_SECRET_KEY"], algorithm="HS256")
    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": {
            "id": str(user["_id"]),
            "username": user["username"],
            "orgName": user["orgName"],
            "role": user["role"],
            "location": user.get("location", {})
        }
    }), 200

@help_assist_bp.route("/api/help_assist/refugee_requests", methods=["GET"])
def get_live_refugee_requests():
    db = current_app.db

    # Only fetch refugee requests with status 'pending' or 'assigned_pending' or 'assigned'
    requests_cursor = db.refugee_requests.find({"status": {"$in": ["pending", "assigned_pending", "assigned"]}})

    results = []
    for req in requests_cursor:
        results.append({
            "id": str(req["_id"]),
            "name": req.get("name", ""),
            "contact": req.get("contact", ""),
            "description": req.get("description", ""),
            "address": req.get("address", ""),
            "location": {
                "latitude": req.get("location", {}).get("latitude"),
                "longitude": req.get("location", {}).get("longitude")
            },
            "file_url": req.get("file_url", ""),
            "timestamp": req.get("timestamp"),
            "status": req.get("status"),
            "assigned_candidates": req.get("assigned_candidates", []),
            "assigned_to": req.get("assigned_to", "")
        })

    return jsonify(results), 200

@help_assist_bp.route("/api/help_assist", methods=["GET"])
def get_all_help_assistants():
    db = current_app.db
    helpers_cursor = db.help_assist_users.find({"status": "approved"})

    results = []
    for helper in helpers_cursor:
        results.append({
            "_id": str(helper["_id"]),
            "name": helper.get("orgName") or helper.get("username"),
            "email": helper.get("email", ""),
            "contact": helper.get("contactInfo", ""),
            "address": helper.get("address", ""),
            "description": helper.get("description", ""),
            "location": helper.get("location", {}),
            "image": helper.get("image", ""),
            "status": helper.get("status", "")
        })

    return jsonify(results), 200



@help_assist_bp.route("/api/help_assist/nearby", methods=["POST"])
def get_nearby_helpers():
    db = current_app.db
    data = request.json
    latitude = data.get("latitude")
    longitude = data.get("longitude")
    request_id = data.get("request_id")

    if latitude is None or longitude is None or not request_id:
        return jsonify({"error": "Missing coordinates or request_id"}), 400

    # Check if already assigned/resolved
    refugee = db.refugee_requests.find_one({"_id": ObjectId(request_id)})
    if not refugee:
        return jsonify({"error": "Refugee request not found"}), 404
    if refugee.get("status") in ["assigned", "resolved"]:
        return jsonify({"message": "Request already assigned or resolved"}), 400

    def haversine(lat1, lon1, lat2, lon2):
        R = 6371
        d_lat = radians(lat2 - lat1)
        d_lon = radians(lon2 - lon1)
        a = sin(d_lat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return R * c

    helpers = db.help_assist_users.find({"status": "approved"})
    nearby_helpers = []

    for h in helpers:
        loc = h.get("location", {})
        if "lat" in loc and "lng" in loc:
            dist = haversine(latitude, longitude, loc["lat"], loc["lng"])
            if dist <= 25:
                h["_id"] = str(h["_id"])
                h["distance_km"] = round(dist, 2)
                nearby_helpers.append(h)

    # Sort and take top 3
    if not nearby_helpers:
        return jsonify({"message": "No nearby helpers found"}), 404

    nearby_helpers.sort(key=lambda h: h["distance_km"])
    top_3 = nearby_helpers[:3]
    assigned_emails = [h["email"] for h in top_3]

    # Update refugee request with candidates
    db.refugee_requests.update_one(
        {"_id": ObjectId(request_id)},
        {
            "$set": {
                "assigned_candidates": assigned_emails,
                "status": "assigned_pending"
            }
        }
    )

    return jsonify({"assigned_candidates": assigned_emails})

@help_assist_bp.route("/api/help_assist/assigned_requests", methods=["GET"])
def get_assigned_requests():
    token = request.headers.get("Authorization")
    if not token or not token.startswith("Bearer "):
        return jsonify({"error": "Missing or invalid token"}), 401

    token = token.split(" ")[1]  # remove "Bearer "
    
    try:
        decoded = jwt.decode(token, current_app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
        email = decoded.get("email")
        if not email:
            return jsonify({"error": "Invalid token payload"}), 401
    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401

    db = current_app.db
    # Use the email to query the assigned requests
    requests = list(db.refugee_requests.find({
        "assigned_candidates": email,
        "status": {"$in": ["assigned", "assigned_pending"]}
    }))

    for req in requests:
        req["_id"] = str(req["_id"])
    
    return jsonify(requests), 200


@help_assist_bp.route("/api/help_assist/accept_assignment", methods=["POST"])
def accept_assignment():
    db = current_app.db
    data = request.json
    refugee_id = data.get("refugee_id")
    helper_email = data.get("helper_email")

    if not refugee_id or not helper_email:
        return jsonify({"error": "Missing refugee_id or helper_email"}), 400

    refugee = db.refugee_requests.find_one({"_id": ObjectId(refugee_id)})
    if not refugee:
        return jsonify({"error": "Refugee not found"}), 404

    if refugee.get("status") == "assigned":
        return jsonify({"message": "Already accepted by another helper"}), 400

    candidate_list = refugee.get("assigned_candidates", [])
    if helper_email not in candidate_list:
        return jsonify({"message": "You are not an eligible candidate for this request"}), 403

    # Atomic update: only succeed if still assigned_pending
    result = db.refugee_requests.update_one(
        {
            "_id": ObjectId(refugee_id),
            "status": "assigned_pending"
        },
        {
            "$set": {
                "assigned_to": helper_email,
                "status": "assigned"
            },
            "$unset": {"assigned_candidates": ""}
        }
    )

    if result.modified_count == 0:
        return jsonify({"message": "Assignment already taken by someone else"}), 400

    return jsonify({"message": "Assignment confirmed"}), 200

@help_assist_bp.route("/api/help_assist/my_assigned_pending", methods=["GET"])
def get_my_assigned_pending_requests():
    db = current_app.db
    helper_email = request.args.get("email")
    status = request.args.get("status", "assigned_pending")

    if not helper_email:
        return jsonify({"error": "Missing helper email"}), 400

    query = {
        "assigned_candidates": {"$in": [helper_email]}
    }

    if status == "both":
        query["status"] = {"$in": ["assigned_pending", "in_progress"]}
    else:
        query["status"] = status

    requests = db.refugee_requests.find(query)

    result = []
    for req in requests:
        req["_id"] = str(req["_id"])
        result.append(req)

    return jsonify(result), 200




@help_assist_bp.route("/api/help_assist/handle-task/<request_id>", methods=["POST"])
def handle_task_request(request_id):
    db = current_app.db
    data = request.json
    helper_email = data.get("email")

    if not helper_email:
        return jsonify({"error": "Missing helper email"}), 400

    # Fetch the request first
    request_data = db.refugee_requests.find_one({"_id": ObjectId(request_id)})

    if not request_data:
        return jsonify({"error": "Request not found"}), 404

    if helper_email not in request_data.get("assigned_candidates", []):
        return jsonify({"error": "You are not assigned to this request"}), 403

    # If already handled by someone else
    if "handled_by" in request_data and request_data["handled_by"] != helper_email:
        return jsonify({"error": f"Task already being handled by {request_data['handled_by']}"}), 400

    # If already handled by this user, just allow resume
    if request_data.get("handled_by") == helper_email:
        return jsonify({"message": "Resuming your task"}), 200

    # Set as handled if no one is yet handling it
    result = db.refugee_requests.update_one(
        {
            "_id": ObjectId(request_id),
            
            "handled_by": {"$exists": False}
        },
        {
            "$set": {
                "handled_by": helper_email,
                "status": "in_progress",
                "inProgressAt": datetime.utcnow()
            }
        }
    )

    if result.modified_count == 0:
        return jsonify({"error": "Another helper is already handling this task."}), 400

    return jsonify({"message": "Task successfully handled by you"}), 200

@help_assist_bp.route("/api/help_assist/complete-task/<request_id>", methods=["POST"])
def complete_task_request(request_id):
    db = current_app.db
    data = request.json
    helper_email = data.get("email")

    if not helper_email:
        return jsonify({"error": "Missing helper email"}), 400

    # ✅ Allow only the one who is actually handling the task to complete it
    req = db.refugee_requests.find_one({
        "_id": ObjectId(request_id),
        "status": "in_progress",
        "handled_by": helper_email
    })

    if not req:
        return jsonify({"error": "Task not found or you are not authorized to complete it"}), 403

    # ✅ Mark as complete
    db.refugee_requests.update_one(
        {"_id": ObjectId(request_id)},
        {"$set": {
            "status": "resolved",
            "resolvedAt": datetime.utcnow()
        }}
    )

    # ✅ Archive to history
    req["status"] = "resolved"
    req["resolvedAt"] = datetime.utcnow()
    req["original_id"] = str(req["_id"])
    req["_id"] = ObjectId()

    db.help_history.insert_one(req)

    return jsonify({"message": "Task marked complete and archived"}), 200

@help_assist_bp.route("/api/help/history", methods=["GET"])
def get_help_history():
    db = current_app.db

    # Get JWT token from Authorization header
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"error": "Missing or invalid Authorization header"}), 401

    token = auth_header.split(" ")[1]

    try:
        # Decode the JWT using your secret key
        decoded = jwt.decode(token, current_app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
        assigned_email = decoded.get("email")

        if not assigned_email:
            return jsonify({"error": "Invalid token payload"}), 401

    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token expired"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 401

    # Query resolved requests assigned to this helper
    history_cursor = db.help_history.find({
        "handled_by": assigned_email,
        "status": "resolved"
    })

    history = []
    for item in history_cursor:
        history.append({
            "_id": str(item.get("_id")),
            "original_id": str(item.get("original_id", "")),
            "name": item.get("name", "N/A"),
            "contact": item.get("contact", "N/A"),
            "description": item.get("description", "N/A"),
            "address": item.get("address", "N/A"),
            "file_url": item.get("file_url", ""),
            "location": item.get("location", {}),
            "assigned_candidates": item.get("assigned_candidates", []),
            "handled_by": item.get("handled_by", ""),
            "status": item.get("status", "resolved"),
            "inProgressAt": item.get("inProgressAt"),
            "resolvedAt": item.get("resolvedAt"),
            "timestamp": item.get("timestamp")
        })

    # Sort by resolvedAt descending
    history.sort(key=lambda x: x.get("resolvedAt", ""), reverse=True)

    return jsonify(history), 200

@help_assist_bp.route("/api/help_assist/nearby_helpers", methods=["GET"])
def nearby_helpers_for_display():
    db = current_app.db
    lat = request.args.get("latitude", type=float)
    lon = request.args.get("longitude", type=float)
    if lat is None or lon is None:
        return jsonify({"error": "Missing coordinates"}), 400

    def haversine(lat1, lon1, lat2, lon2):
        R = 6371
        d_lat = radians(lat2 - lat1)
        d_lon = radians(lon2 - lon1)
        a = sin(d_lat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(d_lon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return R * c

    helpers_cursor = db.help_assist_users.find({"status": "approved"})
    nearby_helpers = []

    for h in helpers_cursor:
        loc = h.get("location", {})
        if "lat" in loc and "lng" in loc:
            distance = haversine(lat, lon, loc["lat"], loc["lng"])
            if distance <= 25:  # 25 km radius
                nearby_helpers.append({
                    "_id": str(h["_id"]),
                    "orgName": h.get("orgName", ""),
                    "username": h.get("username", ""),
                    "contactInfo": h.get("contactInfo", ""),
                    "address": h.get("address", ""),
                    "description": h.get("description", ""),
                    "distance_km": round(distance, 2),
                    "image": f"/uploads/{h.get('image')}" if h.get("image") else ""  # full URL path
                })

    nearby_helpers.sort(key=lambda h: h["distance_km"])
    return jsonify(nearby_helpers[:5]), 200
