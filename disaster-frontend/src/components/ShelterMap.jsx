// src/pages/ShelterMap.jsx
import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import L from "leaflet";
import axios from "axios";
import toast from "react-hot-toast";
import "leaflet/dist/leaflet.css";
import { API_BASE_URL } from "../config";


const userIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [30, 30],
});

const shelterIcon = (capacity) =>
  new L.Icon({
    iconUrl:
      parseInt(capacity) > 50
        ? "https://cdn-icons-png.flaticon.com/512/252/252025.png" // Green
        : parseInt(capacity) > 10
        ? "https://cdn-icons-png.flaticon.com/512/252/252033.png" // Yellow
        : "https://cdn-icons-png.flaticon.com/512/252/252021.png", // Red
    iconSize: [32, 32],
  });

const nearestIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/447/447031.png", // Purple marker
  iconSize: [36, 36],
});

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(2);
}

const FlyToLocation = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
      map.flyTo([lat, lng], 14);
    }
  }, [lat, lng]);
  return null;
};

const ShelterMap = () => {
  const navigate = useNavigate();
  const [shelters, setShelters] = useState([]);
  const [userLoc, setUserLoc] = useState(null);
  const [nearest, setNearest] = useState(null);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/shelters`)

      .then((res) => setShelters(res.data))
      .catch(() => toast.error("Failed to load shelters"));
  }, []);

  const findNearest = (loc) => {
    if (!loc) return toast.error("Get your location first");

    let minDist = Infinity;
    let closest = null;

    shelters.forEach((s) => {
      const dist = getDistance(loc.lat, loc.lng, s.latitude, s.longitude);
      if (dist < minDist) {
        minDist = dist;
        closest = s;
      }
    });

    if (closest) {
      setNearest(closest);
      toast.success(
        `Nearest: ${closest.name || closest.orgName} (${minDist} km)`
      );
    }
  };

  const getLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        };
        setUserLoc(loc);
        toast.success("User location captured");
        findNearest(loc); // Auto-find nearest after location
      },
      () => toast.error("Unable to get location")
    );
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">🧭 Shelter Map</h2>
      <div className="flex gap-4 mb-4">
        <button
          onClick={getLocation}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow"
        >
          📍 Get My Location
        </button>
        <button
          onClick={() => findNearest(userLoc)}
          className="bg-green-600 text-white px-4 py-2 rounded shadow"
        >
          🧭 Find Nearest Shelter
        </button>
        <button
          onClick={() => navigate("/shelters/ar")}
          className="bg-purple-600 text-white px-4 py-2 rounded shadow"
        >
          🕶️ Open Shelter AR
        </button>
      </div>

      <MapContainer
        center={[20.59, 78.96]}
        zoom={5}
        style={{ height: "80vh", width: "100%" }}
        className="h-[80vh] rounded-xl shadow"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {userLoc && (
          <>
            <Marker position={[userLoc.lat, userLoc.lng]} icon={userIcon}>
              <Popup>📍 You are here</Popup>
            </Marker>
            <FlyToLocation lat={userLoc.lat} lng={userLoc.lng} />
          </>
        )}

        {shelters.map((shelter) => {
          const dist =
            userLoc &&
            getDistance(
              userLoc.lat,
              userLoc.lng,
              shelter.latitude,
              shelter.longitude
            );

          const isNearest = nearest && shelter._id === nearest._id;

          return (
            <Marker
              key={shelter._id}
              position={[shelter.latitude, shelter.longitude]}
              icon={isNearest ? nearestIcon : shelterIcon(shelter.capacity)}
            >
              <Popup>
                <strong>
                  {shelter.name || shelter.orgName || "Unnamed Shelter"}
                </strong>
                <br />
                📞 {shelter.contact || "N/A"}
                <br />
                🧍 Capacity: {shelter.capacity || "Unknown"}
                <br />
                🏠 Address: {shelter.address || "Unknown"}
                <br />
                📝 Description: {shelter.description || "No description"}
                {userLoc && <div>📏 {dist} km away</div>}
                {shelter.file && (
                  <img
                    src={`/uploads/${shelter.file}`}
                    alt="Shelter"
                    className="w-full mt-2 rounded"
                  />
                )}
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default ShelterMap;
