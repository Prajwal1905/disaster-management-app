import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";
import { ROLE_TO_TYPES, ROLE_RADIUS } from "../../utils/hazardMapping";

const AllAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [authority, setAuthority] = useState(null);
  const socket = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem("authorityUser");
    

    if (stored) {
      const parsed = JSON.parse(stored);
      console.log("Logged-in authority _id:", parsed._id);

      setAuthority(parsed);
      fetchAlerts(parsed);

      // Setup Socket.IO
      socket.current = io("http://localhost:5000"); // adjust URL if needed
      socket.current.on("connect", () => console.log("🟢 Socket connected"));

      socket.current.on("new_alert", (data) => {
        handleNewAlert(data, parsed);
      });

      return () => {
        if (socket.current) socket.current.disconnect();
      };
    }
  }, []);

  const fetchAlerts = async (auth) => {
    try {
      const { role, _id, location } = auth;
      const lat = location?.lat;
      const lon = location?.lng;
      const radius = ROLE_RADIUS[role] || 15;
      const allowedTypes = ROLE_TO_TYPES[role] || [];

      const res = await axios.get("http://localhost:5000/api/alerts/all", {
        params: { role, auth_id: _id },
      });

      const filtered = (res.data || []).filter((alert) => {
        if ((alert.status || "").toLowerCase() === "resolved") return false;
        if (!allowedTypes.includes((alert.type || "").toLowerCase())) return false;
        
        return true;
      });

      setAlerts(filtered);
    } catch (err) {
      console.error("Error fetching alerts", err);
      toast.error("Failed to load alerts");
    }
  };

  const handleNewAlert = (alert, auth) => {
    if (!auth) return;

    const { role, location } = auth;
    const lat = location?.lat;
    const lon = location?.lng;
    const radius = ROLE_RADIUS[role] || 15;
    const allowedTypes = ROLE_TO_TYPES[role] || [];

    // Filter by type and distance
    if (
      (alert.status || "").toLowerCase() !== "resolved" &&
      allowedTypes.includes((alert.type || "").toLowerCase())
    ) {
      if (lat != null && lon != null) {
        const distance = getDistanceFromLatLonInKm(lat, lon, alert.latitude, alert.longitude);
        if (distance > radius) return;
      }

      setAlerts((prev) => [alert, ...prev]);
      toast.success(`🚨 New ${alert.type} alert!`);
    }
  };

  const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const deg2rad = (deg) => deg * (Math.PI / 180);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">
        📄 All {authority?.role} Alerts
      </h2>
      {alerts.length === 0 ? (
        <p className="text-gray-500">No alerts available</p>
      ) : (
        <ul className="space-y-2">
          {alerts.map((alert) => (
            <li key={alert._id} className="bg-white p-4 rounded shadow">
              <strong>{alert.type}</strong> - {alert.description || "N/A"}
              <br />
              <span className="text-sm text-gray-500">
                🕒 {new Date(alert.timestamp).toLocaleString()}
              </span>
              {alert.file_url && (
                <img
                  src={alert.file_url}
                  alt="Alert"
                  className="mt-2 rounded w-full max-w-[200px]"
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AllAlerts;
