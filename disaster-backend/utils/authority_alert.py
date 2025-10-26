from models.authority_model import authorities
from utils.hazard_mapping import ROLE_ALERT_MAPPING, ROLE_RADIUS

def find_authorities_nearby(alert_type, alert_location, radius_km=None):
    """
    Given an alert type and location, find nearby authority users responsible
    for that type within the defined radius (from ROLE_RADIUS).
    """
    # Get the responsible authority role for this alert type
    role = ROLE_ALERT_MAPPING.get(alert_type.lower())
    if not role:
        return []

    # ✅ Respect the passed-in radius if provided
    if radius_km is None:
        radius_km = ROLE_RADIUS.get(role, 20)  # default fallback

    radius_meters = radius_km * 1000

    # Query authorities with matching role near the alert location
    nearby_authorities = authorities.find({
        "role": role,
        "location": {
            "$near": {
                "$geometry": {
                    "type": "Point",
                    "coordinates": alert_location  # [longitude, latitude]
                },
                "$maxDistance": radius_meters
            }
        }
    })

    return list(nearby_authorities)
