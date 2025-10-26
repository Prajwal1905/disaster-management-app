# models/authority_model.py
from pymongo import MongoClient
from dotenv import load_dotenv
import os

load_dotenv()
client = MongoClient(os.getenv("MONGO_URI"))
db = client["disaster_app"]
authorities = db["authorities"]
