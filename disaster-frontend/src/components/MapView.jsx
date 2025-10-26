import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import axios from "axios";

const alertIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/535/535234.png",
  iconSize: [32, 32],
});

const shelterIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/616/616408.png",
  iconSize: [32, 32],
});

const MapView = () => {
  const [alerts, setAlerts] = useState([]);
  const [shelters, setShelters] = useState([]);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const res = await axios.get("/api/alerts");
        setAlerts(res.data);
      } catch (err) {
        console.error("Error fetching alerts:", err);
      }
    };

    const fetchShelters = async () => {
      try {
        const res = await axios.get("/api/shelters");
        setShelters(res.data);
      } catch (err) {
        console.error("Error fetching shelters:", err);
      }
    };

    fetchAlerts();
    fetchShelters();
  }, []);

  return (
    <MapContainer
      center={[20.5937, 78.9629]}
      zoom={5}
      className="h-[500px] w-full rounded"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
      />

      {/* 🔴 Disaster Alerts */}
      {alerts
        .filter(
          (alert) =>
            typeof alert.latitude === "number" &&
            typeof alert.longitude === "number"
        )
        .map((alert, i) => (
          <Marker
            key={`alert-${i}`}
            icon={alertIcon}
            position={[alert.latitude, alert.longitude]}
          >
            <Popup>
              <div>
                <strong>{alert.type}</strong>
                <p>{alert.description}</p>
                <p>
                  <b>Reported By:</b> {alert.name || "Anonymous"}
                </p>
                <p>
                  <b>Contact:</b> {alert.contact || "N/A"}
                </p>
                <p>
                  <b>Location:</b>{" "}
                  {alert?.location?.coordinates?.length === 2
                    ? `Lat: ${alert.location.coordinates[1]}, Lon: ${alert.location.coordinates[0]}`
                    : alert.location_text || "Unknown"}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

      {/* 🏠 Shelters */}
      {shelters.map((shelter, i) => (
        <Marker
          key={`shelter-${i}`}
          icon={shelterIcon}
          position={[shelter.latitude, shelter.longitude]}
        >
          <Popup>
            <div>
              <strong>{shelter.name}</strong>
              <p>
                <b>Address:</b> {shelter.address}
              </p>
              <p>
                <b>Contact:</b> {shelter.contact}
              </p>
              <p>
                <b>Capacity:</b> {shelter.capacity}
              </p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${shelter.latitude},${shelter.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline"
              >
                📍 View on Google Maps
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default MapView;
