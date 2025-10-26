from flask import Blueprint, request, jsonify, current_app
from bson import ObjectId
from utils.twilio_utils import send_sms

superadmin_help_bp = Blueprint("superadmin_help", __name__)

@superadmin_help_bp.route("/api/superadmin/help-requests", methods=["GET"])
def get_help_requests():
    db = current_app.db
    # 👉 This line needs to change
    helpers = list(db.help_assist_users.find({"status": {"$in": ["pending", "approved"]}}))

    for helper in helpers:
        helper["_id"] = str(helper["_id"])
        if "location" in helper:
            try:
                helper["location"]["lat"] = float(helper["location"].get("lat", 0))
                helper["location"]["lng"] = float(helper["location"].get("lng", 0))
            except Exception:
                helper["location"] = {}

    return jsonify(helpers), 200


@superadmin_help_bp.route("/api/superadmin/help-approve", methods=["POST"])
def approve_helper():
    db = current_app.db
    data = request.json
    helper_id = data.get("id")

    if not helper_id:
        return jsonify({"error": "Helper ID missing"}), 400

    helper = db.help_assist_users.find_one({"_id": ObjectId(helper_id)})
    if not helper:
        return jsonify({"error": "Helper not found"}), 404

    db.help_assist_users.update_one({"_id": ObjectId(helper_id)}, {"$set": {"status": "approved"}})

    contact = helper.get("contactInfo")
    message = f"Hello {helper.get('orgName')}, your Help Assistance registration has been approved ✅. You can now log in."
    if contact:
        send_sms(contact, message)

    return jsonify({"message": "Help Assistance approved and notified"}), 200

@superadmin_help_bp.route("/api/superadmin/help-reject", methods=["POST"])
def reject_helper():
    db = current_app.db
    data = request.json
    helper_id = data.get("id")

    if not helper_id:
        return jsonify({"error": "Helper ID missing"}), 400

    helper = db.ngo_users.find_one({"_id": ObjectId(helper_id)})
    if not helper:
        return jsonify({"error": "Helper not found"}), 404

    db.ngo_users.update_one({"_id": ObjectId(helper_id)}, {"$set": {"status": "rejected"}})

    # 🔔 Send SMS or WhatsApp
    contact = helper.get("contactInfo")
    message = f"Hello {helper.get('orgName')}, unfortunately your Help Assistance registration has been rejected ❌."
    if contact:
        send_sms(contact, message)

    return jsonify({"message": "Help Assistance rejected and notified"}), 200

