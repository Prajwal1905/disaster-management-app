from pymongo import MongoClient
from deepface import DeepFace
from PIL import Image
import numpy as np
import bcrypt
import os
import pickle
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

# === MongoDB Setup ===
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
client = MongoClient(MONGO_URI)
db = client["disaster_app"]
admin_collection = db["admin_users"]

# === Superadmin credentials ===
username = "superadmin"
password = "123"
image_path = "superadmin_face.jpg"

# === Check image ===
if not os.path.exists(image_path):
    raise FileNotFoundError("❌ superadmin_face.jpg not found!")

# === Check if user already exists ===
if admin_collection.find_one({"username": username}):
    print("❌ Superadmin already exists.")
    exit()

# === Generate / Load Encryption Key ===
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

# === Generate face embedding ===
image = Image.open(image_path).convert("RGB")
img_np = np.array(image)
embedding = DeepFace.represent(img_np, model_name="Facenet512")[0]["embedding"]

# === Encrypt embedding ===
embedding_bytes = pickle.dumps(embedding)
encrypted_embedding = fernet.encrypt(embedding_bytes)

# === Hash password ===
hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

# === Store in DB ===
admin_collection.insert_one({
    "username": username,
    "role": "superadmin",
    "password": hashed_pw.decode("utf-8"),
    "face_embedding_encrypted": encrypted_embedding.decode("utf-8")
})

# === Delete raw image ===
os.remove(image_path)

print("✅ Superadmin registered securely — image deleted, embedding encrypted.")
