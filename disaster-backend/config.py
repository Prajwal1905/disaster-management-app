import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    MONGO_URI = os.getenv("MONGO_URI")
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER")
    ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "mp4", "mov"}
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')