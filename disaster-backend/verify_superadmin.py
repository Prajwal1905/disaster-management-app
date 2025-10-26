# verify_superadmin_deepface.py

from deepface import DeepFace
from pymongo import MongoClient
import bcrypt
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# MongoDB setup
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)
db = client["disaster"]
admin_collection = db["admin_users"]

# === Input (you can later get this via frontend form + webcam) ===
username = "superadmin"
input_password = "YourSecurePassword123"
live_capture_path = "captured_login_image.jpg"  # This image must be captured during login

# === Check if user exists ===
admin = admin_collection.find_one({"username": username})

if not admin:
    print("❌ SuperAdmin not found.")
    exit()

# === Step 1: Password Verification ===
if not bcrypt.checkpw(input_password.encode('utf-8'), admin["password"].encode('utf-8')):
    print("❌ Invalid password.")
    exit()

# === Step 2: Face Verification ===
stored_image_path = admin["face_image"]  # Stored during registration

try:
    result = DeepFace.verify(img1_path=live_capture_path, img2_path=stored_image_path)

    if result["verified"]:
        print("✅ SuperAdmin verified successfully!")
    else:
        print("❌ Face verification failed.")
except Exception as e:
    print("❌ Error during face verification:", e)
