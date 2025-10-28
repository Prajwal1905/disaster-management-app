from flask import Blueprint, request, jsonify
from pymongo import MongoClient
from deepface import DeepFace
from PIL import Image
import numpy as np
import bcrypt
import pickle
from cryptography.fernet import Fernet
import os
from io import BytesIO
from dotenv import load_dotenv

load_dotenv()

superadmin_face_bp = Blueprint("superadmin_face_bp", __name__)

# --- MongoDB setup ---
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)
db = client["disaster_app"]
admin_collection = db["admin_users"]

# --- Encryption key setup ---
KEY_FILE = "utils/face_encryption.key"
os.makedirs("utils", exist_ok=True)
if not os.path.exists(KEY_FILE):
    key = Fernet.generate_key()
    with open(KEY_FILE, "wb") as f:
        f.write(key)
else:
    with open(KEY_FILE, "rb") as f:
        key = f.read()
fernet = Fernet(key)

@superadmin_face_bp.route("/api/superadmin/register-face", methods=["POST"])
def register_superadmin_face():
    """Register superadmin with encrypted DeepFace embedding"""
    try:
        username = request.form.get("username")
        password = request.form.get("password")
        image_file = request.files.get("image")

        if not username or not password or not image_file:
            return jsonify({"error": "Missing username, password or image"}), 400

        # check if already exists
        if admin_collection.find_one({"username": username, "role": "superadmin"}):
            return jsonify({"error": "Superadmin already exists"}), 400

        # read image into numpy
        image = Image.open(BytesIO(image_file.read())).convert("RGB")
        img_np = np.array(image)

        # generate DeepFace embedding
        embedding = DeepFace.represent(img_np, model_name="Facenet512")[0]["embedding"]

        # encrypt embedding
        embedding_bytes = pickle.dumps(embedding)
        encrypted_embedding = fernet.encrypt(embedding_bytes)

        # hash password
        hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

        # insert into DB
        admin_collection.insert_one({
            "username": username,
            "role": "superadmin",
            "password": hashed_pw.decode("utf-8"),
            "face_embedding_encrypted": encrypted_embedding.decode("utf-8")
        })

        return jsonify({"message": "✅ Superadmin face registered securely."}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@superadmin_face_bp.route("/api/superadmin/verify-face", methods=["POST"])
def verify_superadmin_face():
    """Verify superadmin credentials + encrypted DeepFace face"""
    try:
        username = request.form.get("username")
        password = request.form.get("password")
        image_file = request.files.get("image")

        if not username or not password or not image_file:
            return jsonify({"error": "Missing username, password or image"}), 400

        # lookup admin
        admin = admin_collection.find_one({"username": username, "role": "superadmin"})
        if not admin:
            return jsonify({"error": "Superadmin not found"}), 404

        # check password
        if not bcrypt.checkpw(password.encode("utf-8"), admin["password"].encode("utf-8")):
            return jsonify({"error": "Invalid password"}), 401

        # decrypt stored embedding
        encrypted_embedding = admin["face_embedding_encrypted"].encode("utf-8")
        embedding = pickle.loads(fernet.decrypt(encrypted_embedding))

        # read uploaded image
        live_image = Image.open(BytesIO(image_file.read())).convert("RGB")
        live_np = np.array(live_image)
        live_embedding = DeepFace.represent(live_np, model_name="Facenet512")[0]["embedding"]

        # compare
        distance = np.linalg.norm(np.array(live_embedding) - np.array(embedding))
        threshold = 0.8

        if distance < threshold:
            return jsonify({"message": "✅ Superadmin verified successfully"}), 200
        else:
            return jsonify({"error": "❌ Face mismatch"}), 403

    except Exception as e:
        return jsonify({"error": str(e)}), 500
