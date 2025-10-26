from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO
from pymongo import MongoClient, GEOSPHERE
from flask_jwt_extended import JWTManager
from flask_apscheduler import APScheduler
import logging

# Import routes
from routes.socket_events import setup_socket_events
from routes.report_routes import report_bp
from routes.shelter_routes import shelter_bp
from routes.alerts_routes import alerts_bp
from routes.community_routes import community_bp
from routes.admin_auth import admin_auth_bp
from routes.superadmin_routes import superadmin_routes
from routes.authority_routes import authority_bp
from routes.refugee_routes import refugee_bp
from routes.volunteer_routes import volunteer_bp
from routes.superadmin_help import superadmin_help_bp
from routes.help_routes import help_assist_bp
from routes.chatbot_routes import chatbot_bp
from routes.weather_bp import weather_bp, check_weather_for_all_users
from routes.sos import sos_bp

from config import Config

# ======================= Flask App Setup =======================
app = Flask(__name__, static_url_path="/static", static_folder="static")
app.config.from_object(Config)

# Enable CORS
CORS(app)

# JWT Setup
app.config.update({
    'JWT_SECRET_KEY': 'your-secret-key',  # Replace in production
    'JWT_TOKEN_LOCATION': ['headers'],
    'JWT_HEADER_NAME': 'Authorization',
    'JWT_HEADER_TYPE': 'Bearer'
})
jwt = JWTManager(app)

# ======================= MongoDB Setup =======================
client = MongoClient(app.config["MONGO_URI"])
db = client.get_database()
app.db = db

# Ensure 2dsphere index for location-based queries
with app.app_context():
    report_collection = db['report']
    indexes = report_collection.index_information()
    if not any(index.get('key') == [('location', '2dsphere')] for index in indexes.values()):
        report_collection.create_index([("location", GEOSPHERE)])
        print("✅ Created 2dsphere index on 'location'")
    else:
        print("ℹ️ 2dsphere index already exists")

# ======================= SocketIO Setup =======================
socketio = SocketIO(app, cors_allowed_origins="*")
app.socketio = socketio

# ======================= Blueprint Registration =======================
blueprints = [
    (report_bp, "/api/report"),
    (shelter_bp, "/api/shelters"),
    (alerts_bp, "/api/alerts"),
    (community_bp, "/api/community"),
    (admin_auth_bp, "/api/superadmin"),
    (superadmin_routes, None),
    (authority_bp, None),
    (refugee_bp, None),
    (volunteer_bp, None),
    (superadmin_help_bp, None),
    (help_assist_bp, None),
    (chatbot_bp, "/api"),
    (weather_bp, None),
    (sos_bp, None)
    
]

for bp, prefix in blueprints:
    if prefix:
        app.register_blueprint(bp, url_prefix=prefix)
    else:
        app.register_blueprint(bp)



# ======================= APScheduler Setup =======================
class SchedulerConfig:
    SCHEDULER_API_ENABLED = True

app.config.from_object(SchedulerConfig)
scheduler = APScheduler()
scheduler.init_app(app)
scheduler.start()

# Scheduler logging
logging.basicConfig()
logging.getLogger('apscheduler').setLevel(logging.DEBUG)

scheduler.remove_all_jobs()

# Proper job function for weather alerts
def weather_alert_job():
    with app.app_context():
        try:
            check_weather_for_all_users()
        except Exception as e:
            print(f"⚠ Weather alert job failed: {e}")

scheduler.add_job(
    id='weather_alert_job',
    func=weather_alert_job,
    trigger='interval',
    minutes=10
)

# ======================= Routes =======================
@app.route("/")
def home():
    return "Disaster Management API is running"

# Serve uploaded files
@app.route('/uploads/<path:filename>')
def general_uploaded_file(filename):
    return send_from_directory('uploads', filename)

@app.route('/static/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory("static/uploads", filename)

app.config["UPLOAD_FOLDER"] = "static/uploads/refugees"
@app.route("/static/uploads/refugees/<filename>")
def refugee_uploaded_file(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

@app.route("/static/uploads/photos/<filename>")
def photo_uploaded_file(filename):
    print(f"Serving: static/uploads/photos/{filename}")
    return send_from_directory("static/uploads/photos", filename)

# ======================= Run App =======================
if __name__ == "__main__":
    setup_socket_events(socketio, db)
    socketio.run(app, debug=True, host="127.0.0.1", port=5000)
