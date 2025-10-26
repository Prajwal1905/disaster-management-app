# register_superadmin_deepface.py

from pymongo import MongoClient
from deepface import DeepFace
from PIL import Image
import numpy as np
import bcrypt
import os
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)
db = client["disaster_app"]
admin_collection = db["admin_users"]

username = "superadmin"
password = "123"
image_path = "superadmin_face.jpg"  # This image must exist in the same folder as the script

# ✅ Check if image exists
if not os.path.exists(image_path):
    raise FileNotFoundError("❌ superadmin_face.jpg not found!")

# ✅ Check if already registered
if admin_collection.find_one({"username": username}):
    print("❌ Superadmin already exists.")
    exit()

# ✅ Load and convert image to array
image = Image.open(image_path).convert("RGB")
img_np = np.array(image)

# ✅ Generate face embedding using DeepFace
embedding = DeepFace.represent(img_np, model_name="Facenet512")[0]["embedding"]

# ✅ Hash password securely
hashed_pw = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

# ✅ Insert into DB
admin_collection.insert_one({
    "username": username,
    "role": "superadmin",
    "password": hashed_pw.decode('utf-8'),
    "face_embedding": embedding,
    
})

print("✅ Superadmin registered with DeepFace embedding.")
