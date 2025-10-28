from deepface import DeepFace
from pymongo import MongoClient
from cryptography.fernet import Fernet
import bcrypt
import pickle
import numpy as np
from PIL import Image
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)
db = client["disaster_app"]
admin_collection = db["admin_users"]

username = "superadmin"
input_password = "123"
live_capture_path = "captured_login_image.jpg"  # captured during login

# === Verify existence ===
admin = admin_collection.find_one({"username": username})
if not admin:
    print("❌ Superadmin not found.")
    exit()

# === Verify password ===
if not bcrypt.checkpw(input_password.encode("utf-8"), admin["password"].encode("utf-8")):
    print("❌ Invalid password.")
    exit()

# === Decrypt stored embedding ===
KEY_FILE = "utils/face_encryption.key"
with open(KEY_FILE, "rb") as f:
    key = f.read()
fernet = Fernet(key)

encrypted_embedding = admin["face_embedding_encrypted"].encode("utf-8")
embedding = pickle.loads(fernet.decrypt(encrypted_embedding))

# === Generate new embedding from live image ===
if not os.path.exists(live_capture_path):
    print("❌ No captured image found for verification.")
    exit()

live_img = Image.open(live_capture_path).convert("RGB")
live_np = np.array(live_img)
live_embedding = DeepFace.represent(live_np, model_name="Facenet512")[0]["embedding"]

# === Compare ===
distance = np.linalg.norm(np.array(live_embedding) - np.array(embedding))
threshold = 0.8  # you can tweak this

if distance < threshold:
    print("✅ SuperAdmin verified successfully!")
else:
    print("❌ Face mismatch detected.")
