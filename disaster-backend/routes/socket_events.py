from flask_socketio import join_room, leave_room, emit 
from datetime import datetime
from bson import ObjectId
from flask import request
from threading import Timer

def setup_socket_events(socketio, db):

    @socketio.on("join")
    def handle_join(data):
        try:
            group_id = data.get("groupId")
            username = data.get("username")
            join_room(group_id)

            group = db.volunteer_groups.find_one({"_id": ObjectId(group_id)})
            if group:
                messages = group.get("messages", [])
                # Serialize datetime to ISO string
                for msg in messages:
                    if isinstance(msg.get("sentAt"), datetime):
                        msg["sentAt"] = msg["sentAt"].isoformat()
                        
                emit("chat_history", messages, room=request.sid)
                

                # Mark all messages as delivered to this user
                for msg in messages:
                    if "deliveredTo" not in msg:
                        msg["deliveredTo"] = []
                    if username not in msg["deliveredTo"]:
                        msg["deliveredTo"].append(username)
                        # Update DB
                        db.volunteer_groups.update_one(
                            {"_id": ObjectId(group_id), "messages._id": msg["_id"]},
                            {"$addToSet": {"messages.$.deliveredTo": username}}
                        )
                # Notify clients about delivery updates
                emit("message_delivery_update", {"deliveredTo": username}, room=group_id)
            print(f"{username} joined room {group_id}")
        except Exception as e:
            print(f"Error in join handler: {e}")

    @socketio.on("send_message")
    def handle_send_message(data):
        try:
            group_id = data.get("groupId")
            sender = data.get("senderEmail")
            message = data.get("message")
            media_url = data.get("mediaUrl")          # URL or base64 for photo/video/voice
            media_type = data.get("mediaType")        # e.g. "image", "video", "audio"
            location = data.get("location")            # dict with lat/lng, e.g. {"lat": 12.34, "lng": 56.78}
            temp_id = data.get("tempId") 

            msg_id = str(ObjectId())
            msg_data = {
                "_id": msg_id,
                "tempId": temp_id,
                "senderEmail": sender,
                "message": message,
                "mediaUrl": media_url,      # optional
                "mediaType": media_type,    # optional
                "location": location,       # optional
                "sentAt": datetime.utcnow(),
                "status": "sent",  # initial status
                "deliveredTo": [], # list of users who received
                "readBy": []       # list of users who read
            }

            # Push message to DB
            db.volunteer_groups.update_one(
                {"_id": ObjectId(group_id)},
                {"$push": {"messages": msg_data}}
            )

            # Serialize datetime before emitting
            msg_data["sentAt"] = msg_data["sentAt"].isoformat()
            print("Emitting message:", msg_data)

            emit("message", msg_data, room=group_id)
        except Exception as e:
            print(f"Error in send_message handler: {e}")

    @socketio.on("typing")
    def handle_typing(data):
        try:
            group_id = data.get("groupId")
            sender = data.get("senderEmail")
            emit("typing", {"senderEmail": sender}, room=group_id, include_self=False)
        except Exception as e:
            print(f"Error in typing handler: {e}")

    @socketio.on("message_read")
    def handle_message_read(data):
        """
        data: {
          groupId: str,
          readerEmail: str,
          messageIds: [str]
        }
        """
        try:
            group_id = data.get("groupId")
            reader = data.get("readerEmail")
            message_ids = data.get("messageIds", [])

            # Update messages in DB to add readerEmail to readBy and set status to "read"
            for msg_id in message_ids:
                db.volunteer_groups.update_one(
                    {"_id": ObjectId(group_id), "messages._id": msg_id},
                    {
                        "$addToSet": {"messages.$.readBy": reader},
                        "$set": {"messages.$.status": "read"}
                    }
                )

            # Notify group about read receipts
            emit("message_read_update", {"readerEmail": reader, "messageIds": message_ids}, room=group_id)
        except Exception as e:
            print(f"Error in message_read handler: {e}")

    @socketio.on("leave")
    def handle_leave(data):
        try:
            group_id = data.get("groupId")
            username = data.get("username")
            leave_room(group_id)
        except Exception as e:
            print(f"Error in leave handler: {e}")
    
    @socketio.on("typing_stop")
    def handle_typing_stop(data):
        try:
            group_id = data.get("groupId")
            sender = data.get("senderEmail")
            emit("typing_stop", {"senderEmail": sender}, room=group_id, include_self=False)
        except Exception as e:
            print(f"Error in typing_stop handler: {e}")

    @socketio.on("edit_message")
    def handle_edit_message(data):
        try:
            group_id = data.get("groupId")
            message_id = data.get("messageId")
            new_text = data.get("newText")

            db.volunteer_groups.update_one(
                {"_id": ObjectId(group_id), "messages._id": message_id},
                {"$set": {"messages.$.message": new_text, "messages.$.edited": True}}
            )
            emit("message_edited", {"messageId": message_id, "newText": new_text}, room=group_id)
        except Exception as e:
            print(f"Error in edit_message handler: {e}")

    @socketio.on("delete_message")
    def handle_delete_message(data):
        try:
            group_id = data.get("groupId")
            message_id = data.get("messageId")

            db.volunteer_groups.update_one(
                {"_id": ObjectId(group_id), "messages._id": message_id},
                {"$set": {"messages.$.deleted": True}}
            )
            emit("message_deleted", {"messageId": message_id}, room=group_id)
        except Exception as e:
            print(f"Error in delete_message handler: {e}")

    @socketio.on("user_presence")
    def handle_user_presence(data):
        try:
            group_id = data.get("groupId")
            username = data.get("username")
            status = data.get("status")  # "online" or "offline"

            emit("presence_update", {"username": username, "status": status}, room=group_id)
        except Exception as e:
            print(f"Error in user_presence handler: {e}")
