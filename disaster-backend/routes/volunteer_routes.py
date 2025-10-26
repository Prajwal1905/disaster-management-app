from flask import Blueprint, request, jsonify, current_app
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import os
import json
import traceback
from bson.errors import InvalidId
import mimetypes
from flask_socketio import emit, join_room



volunteer_bp = Blueprint("volunteer", __name__)
client = MongoClient("mongodb://localhost:27017/")
db = client["disaster_app"]

# -----------------------------
# Utility to serialize ObjectId and datetime
# -----------------------------
def serialize_volunteer(vol):
    vol["_id"] = str(vol["_id"])
    if "assigned_tasks" in vol:
        for t in vol["assigned_tasks"]:
            t["assignedAt"] = t["assignedAt"].isoformat() if isinstance(t["assignedAt"], datetime) else t["assignedAt"]
    if "joinedAt" in vol:
        vol["joinedAt"] = vol["joinedAt"].isoformat()
    return vol

# -----------------------------
# Parse availability field
# -----------------------------
def parse_availability(avail):
    if isinstance(avail, str):
        parts = avail.split("/")
        return {
            "days": parts[0].strip(),
            "time": parts[1].strip() if len(parts) == 2 else "Any"
        }
    return {"days": "Any", "time": "Any"}

# -----------------------------
# Volunteer Registration
# -----------------------------
@volunteer_bp.route("/api/volunteer-join", methods=["POST"])
def volunteer_join():
    data = request.json
    required_fields = ["name", "phone", "email", "pincode", "district", "password"]

    for field in required_fields:
        if not data.get(field):
            return jsonify({"error": f"{field} is required"}), 400

    # Check for duplicate phone or email
    if db.volunteers.find_one({"$or": [{"phone": data["phone"]}, {"email": data["email"]}]}):
        return jsonify({"error": "Volunteer with this phone or email already exists"}), 409

    hashed_password = generate_password_hash(data["password"])
    volunteer = {
        "name": data["name"],
        "phone": data["phone"],
        "email": data["email"],
        "pincode": data["pincode"],
        "district": data["district"],
        "skills": data.get("skills", "volunteer"),
        "preferredTasks": data.get("preferredTasks", "volunteer"),
        "availability": parse_availability(data.get("availability")),
        "joinedAt": datetime.utcnow(),
        "assigned_tasks": [],
        "password": hashed_password
    }

    db.volunteers.insert_one(volunteer)
    return jsonify({"message": "Volunteer registered successfully"}), 200

# -----------------------------
# Volunteer Login
# -----------------------------
@volunteer_bp.route("/api/volunteer-login", methods=["POST"])
def volunteer_login():
    data = request.json
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    volunteer = db.volunteers.find_one({"email": email})
    if not volunteer or not check_password_hash(volunteer.get("password", ""), password):
        return jsonify({"error": "Invalid email or password"}), 401

    return jsonify({"message": "Login success", "volunteer": serialize_volunteer(volunteer)}), 200

# -----------------------------
# Get All Volunteers
# -----------------------------
@volunteer_bp.route("/api/volunteers", methods=["GET"])
def get_volunteers():
    volunteers = list(db.volunteers.find({}))
    for v in volunteers:
        v["_id"] = str(v["_id"])
    return jsonify(volunteers), 200



# -----------------------------
# Volunteer Feed (Groups + Notifications)
# -----------------------------
@volunteer_bp.route("/api/volunteer-feed/<volunteer_id>", methods=["GET"])
def get_volunteer_feed(volunteer_id):
    try:
        groups = list(db.volunteer_groups.find({"members": ObjectId(volunteer_id)}))
        notifications = []

        for g in groups:
            for m in g.get("messages", []):
                notifications.append({
                    "_id": str(ObjectId()),
                    "groupId": str(g["_id"]),
                    "title": f"Group: {g['name']}",
                    "message": m["message"],
                    "media": m.get("mediaUrl"),
                    "sentAt": m["sentAt"].isoformat() if isinstance(m["sentAt"], datetime) else m["sentAt"]
                })

        for g in groups:
            g["_id"] = str(g["_id"])
            g["members"] = [str(m) for m in g["members"]]
            g["createdAt"] = g["createdAt"].isoformat()

        notifications.sort(key=lambda x: x["sentAt"], reverse=True)

        return jsonify({
            "groups": groups,
            "notifications": notifications
        }), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch feed", "details": str(e)}), 500

# -----------------------------
# Get Personal Notifications
# -----------------------------
@volunteer_bp.route("/api/notifications/<email>", methods=["GET"])
def get_notifications(email):
    try:
        notes = list(db.notifications.find({"email": email}).sort("timestamp", -1))
        for n in notes:
            n["_id"] = str(n["_id"])
            n["timestamp"] = n["timestamp"].isoformat()
        return jsonify(notes), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch notifications", "details": str(e)}), 500

# Utility to serialize group data including messages and dates
def serialize_group(group):
    group["_id"] = str(group["_id"])
    group["createdAt"] = group["createdAt"].isoformat() if "createdAt" in group else None
    group["members"] = [str(m) for m in group.get("members", [])]
    for msg in group.get("messages", []):
        msg["sentAt"] = msg["sentAt"].isoformat() if isinstance(msg.get("sentAt"), datetime) else msg.get("sentAt")
    return group

@volunteer_bp.route("/api/group", methods=["POST"])
def create_group():
    try:
        # Support form data (multipart/form-data)
        if request.content_type.startswith("multipart/form-data"):
            name = request.form.get("name")
            message = request.form.get("message")
            members = json.loads(request.form.get("members", "[]"))
            creatorEmail = request.form.get("creatorEmail")
            media_file = request.files.get("media")

            if not name or not message or not creatorEmail:
                return jsonify({"error": "Missing required fields"}), 400

            media_url = None
            if media_file:
                filename = secure_filename(media_file.filename)
                save_path = os.path.join("uploads", filename)
                media_file.save(save_path)
                # You should ideally serve this folder statically and build a full URL
                media_url = f"/uploads/{filename}"

            group_doc = {
                "name": name,
                "message": message,
                "members": members,
                "creatorEmail": creatorEmail,
                "mediaUrl": media_url,
                "createdAt": datetime.utcnow(),
                "messages": []
            }

            result = db.volunteer_groups.insert_one(group_doc)

            # Create an invite link (example)
            invite_link = f"/admin/volunteer-group/{str(result.inserted_id)}"

            return jsonify({
                "message": "Group created",
                "inviteLink": invite_link,
                "name": name,
                "_id": str(result.inserted_id),
            }), 201

        else:
            # If JSON content, handle here (optional)
            data = request.json
            # similar logic for JSON payload if needed
            return jsonify({"error": "Unsupported Content-Type"}), 400

    except Exception as e:
        return jsonify({"error": "Failed to create group", "details": str(e)}), 500


# GET group details including messages
@volunteer_bp.route("/api/volunteer-groups/<group_id>", methods=["GET"])
def get_group(group_id):
    try:
        group = db.volunteer_groups.find_one({"_id": ObjectId(group_id)})
        if not group:
            return jsonify({"error": "Group not found"}), 404
        return jsonify(serialize_group(group)), 200
    except Exception as e:
        return jsonify({"error": "Invalid group ID or server error", "details": str(e)}), 400

# GET only messages for a group
@volunteer_bp.route("/api/group/<group_id>/messages", methods=["GET"])
def get_group_messages(group_id):
    try:
        group = db.volunteer_groups.find_one({"_id": ObjectId(group_id)}, {"messages": 1})
        if not group:
            return jsonify({"error": "Group not found"}), 404
        messages = group.get("messages", [])
        # Serialize datetime in messages
        for msg in messages:
            msg["sentAt"] = msg["sentAt"].isoformat() if isinstance(msg.get("sentAt"), datetime) else msg.get("sentAt")
        return jsonify(messages), 200
    except Exception as e:
        return jsonify({"error": "Invalid group ID or server error", "details": str(e)}), 400

# POST new message to group chat
@volunteer_bp.route("/api/group/<group_id>/message", methods=["POST"])
def post_group_message(group_id):
    try:
        import mimetypes

        sender_email = None
        message = None
        media_url = None
        media_type = None

        # If request is multipart/form-data (sending file + form fields)
        if request.content_type and request.content_type.startswith("multipart/form-data"):
            sender_email = request.form.get("senderEmail")
            message = request.form.get("message")

            # Handle file upload
            media_file = request.files.get("media")
            if media_file:
                upload_folder = os.path.join(current_app.root_path, "static", "uploads", "photos")
                os.makedirs(upload_folder, exist_ok=True)

                original_filename = secure_filename(media_file.filename)
                timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
                filename = f"{timestamp}_{original_filename}"

                save_path = os.path.join(upload_folder, filename)
                media_file.save(save_path)

                # Build full URL
                media_url = f"{request.host_url}static/uploads/photos/{filename}".rstrip("/")

                # Detect file type
                mime_type, _ = mimetypes.guess_type(filename)
                if mime_type:
                    if mime_type.startswith("image"):
                        media_type = "image"
                    elif mime_type.startswith("video"):
                        media_type = "video"
                    elif mime_type.startswith("audio"):
                        media_type = "audio"

        else:
            # Handle normal JSON
            data = request.json or {}
            sender_email = data.get("senderEmail")
            message = data.get("message")
            media_url = data.get("mediaUrl")
            media_type = data.get("mediaType")

        # Validation — allow either message or media
        if not sender_email or (not message and not media_url):
            return jsonify({"error": "senderEmail and either message or media required"}), 400

        group = db.volunteer_groups.find_one({"_id": ObjectId(group_id)})
        if not group:
            return jsonify({"error": "Group not found"}), 404

        new_message = {
            "senderEmail": sender_email,
            "message": message,
            "mediaUrl": media_url,
            "mediaType": media_type,
            "sentAt": datetime.utcnow()
        }

        # Save to DB
        db.volunteer_groups.update_one(
            {"_id": ObjectId(group_id)},
            {"$push": {"messages": new_message}}
        )

        # 🔑 Emit via socket to all group members
        emit("new_message", {
            "groupId": str(group["_id"]),
            **new_message,
            "sentAt": new_message["sentAt"].isoformat()
        }, room=str(group["_id"]), namespace="/")

        return jsonify({
            "message": "Message sent",
            "mediaUrl": media_url,
            "mediaType": media_type
        }), 200

    except Exception as e:
        return jsonify({"error": "Failed to send message", "details": str(e)}), 500


    
@volunteer_bp.route("/api/volunteer-groups", methods=["GET"])
def get_all_volunteer_groups():
    try:
        groups = list(db.volunteer_groups.find({}))
        for g in groups:
            g["_id"] = str(g["_id"])
            g["createdAt"] = g["createdAt"].isoformat() if "createdAt" in g else None
            g["members"] = [str(m) for m in g.get("members", [])]
        return jsonify(groups), 200
    except Exception as e:
        return jsonify({"error": "Failed to fetch volunteer groups", "details": str(e)}), 500

@volunteer_bp.route("/api/volunteer-groups/<group_id>/join", methods=["POST"])
def join_group(group_id):
    data = request.json
    email = data.get("email")
    if not email:
        return jsonify({"error": "Email is required"}), 400

    try:
        group = db.volunteer_groups.find_one({"_id": ObjectId(group_id)})
        if not group:
            return jsonify({"error": "Group not found"}), 404

        # Prevent duplicate join
        if email in group.get("members", []):
            return jsonify({"message": "Already a member"}), 200

        # Add email to members list
        db.volunteer_groups.update_one(
            {"_id": ObjectId(group_id)},
            {"$push": {"members": email}}
        )
        return jsonify({"message": "Joined group successfully"}), 200
    except Exception as e:
        return jsonify({"error": "Failed to join group", "details": str(e)}), 500
