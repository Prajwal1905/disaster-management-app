from flask import Blueprint, request, jsonify, current_app
from flask_cors import cross_origin
import math
import requests

chatbot_bp = Blueprint("chatbot_bp", __name__)

# --------------------------
# Helpers
# --------------------------

def haversine(lat1, lon1, lat2, lon2):
    R = 6371  # Earth radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def reverse_geocode(lat, lon):
    try:
        res = requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={"format": "json", "lat": lat, "lon": lon},
            headers={"User-Agent": "disaster-chatbot"}
        )
        return res.json().get("display_name") if res.ok else "Unknown"
    except:
        return "Unknown"

def translate_reply(en_text, hi_text, lang):
    return hi_text if lang == "hi-IN" else en_text

# --------------------------
# Handlers
# --------------------------

def nearest_shelter(db, lat, lng, lang="en-IN"):
    shelters = list(db.shelters.find())
    if not shelters or lat is None or lng is None:
        return translate_reply("No shelter data found.", "कोई शेल्टर डेटा नहीं मिला।", lang), None

    nearest = min(shelters, key=lambda s: haversine(lat, lng, s["latitude"], s["longitude"]))
    distance = haversine(lat, lng, nearest["latitude"], nearest["longitude"])
    reply_en = f"Nearest shelter is {nearest['name']} ({distance:.1f} km away). Capacity: {nearest.get('capacity', 'N/A')}"
    reply_hi = f"सबसे नजदीकी शेल्टर {nearest['name']} है ({distance:.1f} किमी दूर)। क्षमता: {nearest.get('capacity', 'N/A')}"
    route_link = f"/shelters"  # frontend route
    return translate_reply(reply_en, reply_hi, lang), route_link

def shelter_capacity(db, shelter_name=None, lang="en-IN"):
    shelters = list(db.shelters.find())
    if shelter_name:
        match = next((s for s in shelters if shelter_name.lower() in s['name'].lower()), None)
        if match:
            reply_en = f"{match['name']} currently has capacity for {match.get('capacity', 'N/A')} people."
            reply_hi = f"{match['name']} में वर्तमान में {match.get('capacity', 'N/A')} लोगों के लिए क्षमता है।"
            return translate_reply(reply_en, reply_hi, lang), None
    return translate_reply("Shelter not found.", "शेल्टर नहीं मिला।", lang), None

def recent_alerts(db, lang="en-IN"):
    alerts = list(db.report.find({"status": "live"}).sort("timestamp", -1).limit(5))
    if alerts:
        reply_lines_en = [f"- {a.get('type', 'Unknown').capitalize()} at {a.get('location_text', 'Unknown')}" for a in alerts]
        reply_lines_hi = [f"- {a.get('type', 'Unknown').capitalize()} स्थान: {a.get('location_text', 'Unknown')}" for a in alerts]
        reply = translate_reply("Here are the 5 most recent hazard alerts:\n" + "\n".join(reply_lines_en),
                                "यहाँ 5 सबसे हालिया खतरे की चेतावनियाँ हैं:\n" + "\n".join(reply_lines_hi),
                                lang)
        return reply, None
    return translate_reply("No recent hazard alerts found.", "हाल की कोई चेतावनी नहीं मिली।", lang), None

def nearby_alerts(db, lat, lng, lang="en-IN", radius_km=10):
    if lat is None or lng is None:
        return translate_reply("User location not provided.", "उपयोगकर्ता का स्थान प्रदान नहीं किया गया है।", lang), None

    query = {
        "status": "live",
        "location": {
            "$near": {
                "$geometry": {"type": "Point", "coordinates": [lng, lat]},
                "$maxDistance": radius_km * 1000
            }
        }
    }
    alerts = list(db.report.find(query).sort("timestamp", -1))
    if alerts:
        reply_lines_en = [f"- {a.get('type', 'Unknown').capitalize()} at {a.get('location_text', 'Unknown')}" for a in alerts]
        reply_lines_hi = [f"- {a.get('type', 'Unknown').capitalize()} स्थान: {a.get('location_text', 'Unknown')}" for a in alerts]
        reply = translate_reply("Nearby alerts:\n" + "\n".join(reply_lines_en),
                                "पास के अलर्ट:\n" + "\n".join(reply_lines_hi),
                                lang)
        return reply, None
    return translate_reply("No alerts found nearby.", "पास में कोई चेतावनी नहीं मिली।", lang), None

def volunteer_opportunities(db, lang="en-IN"):
    posts = list(db.volunteer_posts.find().sort("timestamp", -1).limit(3))
    if posts:
        reply_lines_en = [f"- {v['title']} in {v['location']}" for v in posts]
        reply_lines_hi = [f"- {v['title']} स्थान: {v['location']}" for v in posts]
        reply = translate_reply("Volunteer opportunities:\n" + "\n".join(reply_lines_en),
                                "स्वयंसेवक अवसर:\n" + "\n".join(reply_lines_hi),
                                lang)
        return reply, None
    return translate_reply("No volunteer opportunities available right now.",
                           "वर्तमान में कोई स्वयंसेवक अवसर उपलब्ध नहीं हैं।", lang), None

def refugee_requests(db, lang="en-IN"):
    requests_list = list(db.refugee_requests.find().sort("timestamp", -1).limit(2))
    if requests_list:
        reply_lines = [f"- {r['name']}: {r['description']}" for r in requests_list]
        reply = translate_reply("Recent refugee help requests:\n" + "\n".join(reply_lines),
                                "हाल की शरणार्थी सहायता अनुरोध:\n" + "\n".join(reply_lines),
                                lang)
        return reply, None
    return translate_reply("No refugee requests at the moment.", "वर्तमान में कोई शरणार्थी अनुरोध नहीं हैं।", lang), None

def emergency_contacts(db, lang="en-IN"):
    contacts = list(db.emergency_contacts.find())
    if contacts:
        reply_lines = [f"- {c['type']}: {c['number']}" for c in contacts]
        reply = translate_reply("Emergency contacts:\n" + "\n".join(reply_lines),
                                "आपातकालीन संपर्क:\n" + "\n".join(reply_lines),
                                lang)
        return reply, None
    return translate_reply("No emergency contacts found.", "कोई आपातकालीन संपर्क नहीं मिला।", lang), None

# --------------------------
# Main chatbot route
# --------------------------

@chatbot_bp.route("/chatbot", methods=["POST", "OPTIONS"])
@cross_origin()
def chatbot():
    if request.method == "OPTIONS":
        return '', 204

    db = current_app.db
    data = request.get_json()
    user_message = data.get("message", "").strip()
    lat = data.get("lat")
    lng = data.get("lng")
    lang = data.get("lang", "en-IN")

    quick_handlers = {
        "Find nearest shelter": lambda: nearest_shelter(db, lat, lng, lang),
        "Shelter capacity in Central Shelter": lambda: shelter_capacity(db, "Central Shelter", lang),
        "Recent alerts": lambda: recent_alerts(db, lang),
        "Nearby alerts": lambda: nearby_alerts(db, lat, lng, lang),
        "Volunteer opportunities": lambda: volunteer_opportunities(db, lang),
        "Refugee Assistant Form": lambda: refugee_requests(db, lang),
        "Apply for shelter": lambda: ("", "/shelter-application"),
        "Volunteer registration": lambda: ("", "/volunteer"),
        "Emergency contacts": lambda: emergency_contacts(db, lang),

        "निकटतम आश्रय खोजें": lambda: nearest_shelter(db, lat, lng, lang),
        "सेंट्रल शेल्टर में क्षमता": lambda: shelter_capacity(db, "Central Shelter", lang),
        "हाल की चेतावनियाँ": lambda: recent_alerts(db, lang),
        "पास के अलर्ट": lambda: nearby_alerts(db, lat, lng, lang),
        "स्वयंसेवक अवसर": lambda: volunteer_opportunities(db, lang),
        "शरणार्थी सहायता फॉर्म": lambda: refugee_requests(db, lang),
        "आश्रय के लिए आवेदन": lambda: ("", "/shelter-application"),
        "स्वयंसेवक पंजीकरण": lambda: ("", "/volunteer"),
        "आपातकालीन संपर्क": lambda: emergency_contacts(db, lang),
    }

    reply = translate_reply(
        "I'm not sure I understand. You can ask me about shelters, alerts, refugee help, volunteers, or navigation.",
        "मुझे समझ नहीं आया। आप मुझसे शेल्टर, चेतावनी, शरणार्थी सहायता, स्वयंसेवक या मार्गदर्शन के बारे में पूछ सकते हैं।",
        lang
    )
    route_link = None
    items = None

    handler = quick_handlers.get(user_message)
    if handler:
        result = handler()
        if isinstance(result, tuple):
            reply, second = result
            if isinstance(second, str) and second.startswith("/"):
                route_link = second
            elif isinstance(second, list):
                items = second
        else:
            reply = result

    return jsonify({
        "reply": reply,
        "routeLink": route_link,
        "items": items
    })
