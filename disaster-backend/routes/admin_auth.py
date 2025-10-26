# routes/admin_auth.py

from flask import Blueprint, request, jsonify
from pymongo import MongoClient
from dotenv import load_dotenv
from flask_jwt_extended import create_access_token
import bcrypt
import os

load_dotenv()
admin_auth_bp = Blueprint('admin_auth_bp', __name__)

# DB setup
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
client = MongoClient(MONGO_URI)
db = client['disaster_app']
admin_collection = db['admin_users']

@admin_auth_bp.route('/login', methods=['POST'])
def login_superadmin_credentials():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    user = admin_collection.find_one({"username": username, "role": "superadmin"})

    if user and bcrypt.checkpw(password.encode('utf-8'), user['password'].encode('utf-8')):
        # Generate JWT token
        access_token = create_access_token(identity=username)
        return jsonify({
            "success": True,
            "message": "✅ Logged in successfully.",
            "token": access_token
        }), 200
    else:
        return jsonify({"success": False, "message": "❌ Invalid credentials"}), 401
