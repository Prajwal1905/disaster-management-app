from flask import Blueprint, jsonify, request, current_app
import requests, os, pickle, re
from datetime import datetime, timedelta
from twilio.rest import Client
from pathlib import Path

# ==== River for online learning ====
from river import linear_model, preprocessing, optim, metrics

weather_bp = Blueprint("weather_bp", __name__)

# ===================== ONLINE MODEL SETUP =====================
MODEL_PATH = Path(os.getenv("WEATHER_MODEL_PATH", "river_disaster_risk_model.pkl"))

risk_model = None
risk_metrics = {
    "logloss": metrics.LogLoss(),
    "accuracy": metrics.Accuracy(),
    "precision": metrics.Precision(),
    "recall": metrics.Recall(),
    "f1": metrics.F1()
}

def make_fresh_model():
    return preprocessing.StandardScaler() | linear_model.LogisticRegression(
        optimizer=optim.SGD(0.05),
        l2=1e-4
    )

def load_model():
    global risk_model, risk_metrics
    risk_model = make_fresh_model()

    if MODEL_PATH.exists():
        try:
            with open(MODEL_PATH, "rb") as f:
                payload = pickle.load(f)
            if "model" in payload:
                risk_model = payload["model"]
            if "metrics" in payload and isinstance(payload["metrics"], dict):
                risk_metrics.update(payload["metrics"])
            print("✅ River model loaded from disk.")
        except Exception as e:
            print(f"⚠ Failed to load model, starting fresh: {e}")

def save_model():
    try:
        with open(MODEL_PATH, "wb") as f:
            pickle.dump({"model": risk_model, "metrics": risk_metrics}, f)
    except Exception as e:
        print(f"⚠ Failed to persist model: {e}")

load_model()

# ===================== WEATHER ENDPOINTS =====================

@weather_bp.route("/api/weather", methods=["GET"])
def get_weather():
    API_KEY = os.getenv("OPENWEATHER_API_KEY")
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    if not API_KEY or not lat or not lon:
        return jsonify({"error": "Missing API key or coordinates"}), 400

    try:
        res = fetch_weather(lat, lon, API_KEY)
        district = get_district(lat, lon)
        weather_data = format_weather_data(res, district)

        alert_message = check_hazard(res, district)
        label = 1 if alert_message else 0

        save_weather_record(res, district, label, float(lat), float(lon))
        x = features_from_weather(res, lat=float(lat), lon=float(lon))
        online_learn(x, label)

        if alert_message:
            send_weather_alert_to_community(alert_message, district)

        return jsonify({"weather": weather_data, "alert": {"message": alert_message} if alert_message else None})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@weather_bp.route("/api/weather/check_all", methods=["GET"])
def check_weather_for_all_users():
    API_KEY = os.getenv("OPENWEATHER_API_KEY")
    if not API_KEY:
        return jsonify({"error": "Missing API key"}), 500

    db = current_app.db
    users = db.community_users.find({})
    alerts_sent = []

    for user in users:
        lat = user.get("latitude")
        lon = user.get("longitude")
        if lat is None or lon is None:
            continue
        try:
            res = fetch_weather(lat, lon, API_KEY)
            district = get_district(lat, lon)
            alert_message = check_hazard(res, district)
            label = 1 if alert_message else 0

            save_weather_record(res, district, label, float(lat), float(lon))
            x = features_from_weather(res, lat=float(lat), lon=float(lon))
            online_learn(x, label)

            if alert_message:
                last_alert = user.get("last_alert_sent")
                if not last_alert or datetime.utcnow() - last_alert > timedelta(hours=6):
                    send_weather_alert(user["phone"], alert_message)
                    db.community_users.update_one({"_id": user["_id"]}, {"$set": {"last_alert_sent": datetime.utcnow()}})
                    alerts_sent.append({"phone": user["phone"], "district": district, "message": alert_message})
        except Exception as e:
            print(f"check_all user {user.get('phone')}: {e}")
            continue

    return jsonify({"status": "completed", "alerts_sent": alerts_sent})

@weather_bp.route("/api/weather/predict_risk", methods=["GET"])
def predict_risk():
    API_KEY = os.getenv("OPENWEATHER_API_KEY")
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    if not API_KEY or not lat or not lon:
        return jsonify({"error": "Missing API key or coordinates"}), 400

    res = fetch_weather(lat, lon, API_KEY)
    district = get_district(lat, lon)
    x = features_from_weather(res, lat=float(lat), lon=float(lon))

    try:
        prob = float(risk_model.predict_proba_one(x))
    except Exception:
        prob = 0.0

    risk_level = "Low"
    if prob >= 0.90:
        risk_level = "Critical"
    elif prob >= 0.70:
        risk_level = "High"
    elif prob >= 0.40:
        risk_level = "Medium"

    return jsonify({"district": district, "risk_probability": round(prob, 3), "risk_level": risk_level})

@weather_bp.route("/api/weather/model_info", methods=["GET"])
def model_info():
    info = {
        "model_type": "River: StandardScaler | LogisticRegression(SGD)",
        "metrics": {k: float(v.get()) for k, v in risk_metrics.items()},
        "model_path": str(MODEL_PATH),
        "persisted": MODEL_PATH.exists()
    }
    return jsonify(info)

# ===================== HELPERS =====================

def features_from_weather(res, lat: float, lon: float) -> dict:
    main = res.get("main", {})
    wind = res.get("wind", {})
    clouds = res.get("clouds", {})
    weather_desc = (res.get("weather", [{}])[0].get("description") or "").lower()

    x = {
        "temp": float(main.get("temp", 0)),
        "feels_like": float(main.get("feels_like", 0)),
        "humidity": float(main.get("humidity", 0)),
        "pressure": float(main.get("pressure", 0)),
        "wind_speed": float(wind.get("speed", 0)),
        "clouds": float(clouds.get("all", 0)),
        "rain_1h": float(res.get("rain", {}).get("1h", 0)),
        "is_storm_word": int("storm" in weather_desc),
        "is_rain_word": int("rain" in weather_desc or "shower" in weather_desc),
        "is_thunder": int("thunder" in weather_desc),
        "is_heat_word": int("heat" in weather_desc or "hot" in weather_desc),
        "lat_bin": round(lat, 1),
        "lon_bin": round(lon, 1),
    }

    try:
        dt_utc = datetime.utcfromtimestamp(res.get("dt", int(datetime.utcnow().timestamp())))
        x.update({"hour": dt_utc.hour, "is_night": int(dt_utc.hour < 6 or dt_utc.hour >= 18), "month": dt_utc.month})
    except Exception:
        x.update({"hour": 0, "is_night": 0, "month": 1})

    x["temp_humid_interaction"] = (x["temp"] * max(0.0, x["humidity"])) / 100.0
    x["cloud_wind"] = x["clouds"] * x["wind_speed"]

    return x

def online_learn(x: dict, y: int):
    global risk_model, risk_metrics
    if risk_model is None:
        risk_model = make_fresh_model()
    if risk_metrics is None:
        risk_metrics.update({
            "logloss": metrics.LogLoss(),
            "accuracy": metrics.Accuracy()
        })

    try:
        proba_dict = risk_model.predict_proba_one(x) 
        if isinstance(proba_dict, dict):
            p = float(proba_dict.get(1, 0.0))
        else:
            p = float(proba_dict or 0.0)

        for m in risk_metrics.values():
            m.update(y, p)
        risk_model.learn_one(x, y)
        save_model()
    except Exception as e:
        print(f"Online learn failed: {e}")

def fetch_weather(lat, lon, api_key):
    url = f"http://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&units=metric&appid={api_key}"
    return requests.get(url, timeout=6).json()

def get_district(lat, lon):
    geo_res = requests.get("https://nominatim.openstreetmap.org/reverse",
                           params={"format": "json", "lat": lat, "lon": lon},
                           headers={"User-Agent": "disaster-management-app"}).json()
    return geo_res.get("address", {}).get("state_district") \
           or geo_res.get("address", {}).get("county") \
           or geo_res.get("address", {}).get("state")

def format_weather_data(res, district):
    return {
        "location": res.get("name"),
        "district": district,
        "temp": res["main"]["temp"],
        "feels_like": res["main"]["feels_like"],
        "description": res["weather"][0]["description"].title(),
        "wind_speed": res["wind"]["speed"],
        "humidity": res["main"]["humidity"],
        "pressure": res["main"]["pressure"],
        "clouds": res["clouds"]["all"],
        "sunrise": datetime.fromtimestamp(res["sys"]["sunrise"]).strftime("%H:%M"),
        "sunset": datetime.fromtimestamp(res["sys"]["sunset"]).strftime("%H:%M"),
        "icon": res["weather"][0]["icon"]
    }

def check_hazard(res, district):
    desc = res["weather"][0]["description"].lower()
    if (res["wind"]["speed"] > 50 or "storm" in desc or "heavy rain" in desc
        or res["main"]["humidity"] > 95 or res["main"]["temp"] > 45 or res["main"]["temp"] < 5):
        return f"⚠ Severe weather warning in {district}! Stay safe."
    return None

def save_weather_record(res, district, hazard_reported=0, lat=None, lon=None):
    try:
        db = current_app.db
        record = {
            "temp": res["main"]["temp"],
            "feels_like": res["main"].get("feels_like"),
            "humidity": res["main"]["humidity"],
            "wind_speed": res["wind"]["speed"],
            "pressure": res["main"]["pressure"],
            "clouds": res["clouds"]["all"],
            "weather_desc": res["weather"][0]["description"].lower(),
            "district": district,
            "lat": lat,
            "lon": lon,
            "hazard_reported": int(hazard_reported),
            "timestamp": datetime.utcnow()
        }
        db.weather_history.insert_one(record)
    except Exception as e:
        print(f"DB insert error: {e}")

def send_weather_alert_to_community(message, district):
    try:
        db = current_app.db
        regex_pattern = re.compile(f".*{re.escape(district)}.*", re.IGNORECASE)
        users = db.community_users.find({"district": regex_pattern})
        for user in users:
            send_weather_alert(user.get("phone"), message)
    except Exception as db_error:
        print(f"Database/SMS error: {db_error}")

def send_weather_alert(phone, message):
    if not phone:
        return
    account_sid = os.getenv("TWILIO_ACCOUNT_SID")
    auth_token = os.getenv("TWILIO_AUTH_TOKEN")
    from_number = os.getenv("TWILIO_PHONE_NUMBER")
    if not (account_sid and auth_token and from_number):
        print("Twilio credentials missing — skipping SMS sending.")
        return
    try:
        client = Client(account_sid, auth_token)
        client.messages.create(body=f"🚨 Weather Alert: {message}", from_=from_number, to=phone)
    except Exception as sms_error:
        print(f"Failed to send SMS to {phone}: {sms_error}")
