# utils/hazard_mapping.py


ROLE_ALERT_MAPPING = {
    "accident": "ambulance_services",
    "ambulance": "ambulance_services",
    "flood": "ndrf",
    "landslide": "ndrf",
    "earthquake": "ndrf",
    "fire": "fire_brigade",
    "police": "police_services"
}

ROLE_RADIUS = {
    "ndrf": 250,
    "ambulance_services": 5,
    "fire_brigade": 15,
    "police_services": 15,
}

ROLE_TO_TYPES = {}
for hazard, role in ROLE_ALERT_MAPPING.items():
    ROLE_TO_TYPES.setdefault(role, []).append(hazard)

