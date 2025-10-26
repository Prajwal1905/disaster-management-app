import React, { useEffect, useState } from "react";
import axios from "axios";
import socket from "../socket";
import { FaExclamationTriangle, FaMapMarkerAlt, FaUser, FaPhone, FaClock } from "react-icons/fa";

const AlertFeed = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await axios.get("/api/alerts/feed");
        setAlerts(response.data);
      } catch (error) {
        console.error("Error fetching alerts feed:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();

    socket.on("new_alert", (data) => {
      setAlerts((prevAlerts) => [data, ...prevAlerts]);
    });
    return () => socket.off("new_alert");
  }, []);

  const getSeverityBadge = (severity) => {
    if (!severity) return <span className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700">N/A</span>;
    switch (severity.toLowerCase()) {
      case "high":
        return <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 font-semibold">High</span>;
      case "medium":
        return <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700 font-semibold">Medium</span>;
      case "low":
        return <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700 font-semibold">Low</span>;
      default:
        return <span className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700">Unknown</span>;
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-gray-800 flex items-center gap-2">
        🛰️ Live Hazard Alerts
      </h2>

      {loading ? (
        <div className="text-center text-gray-500 animate-pulse">Loading alerts...</div>
      ) : alerts.length === 0 ? (
        <div className="text-center text-gray-500">No alerts found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {alerts.map((alert) => (
            <div
              key={alert._id}
              className="bg-white shadow-lg hover:shadow-2xl rounded-xl border border-gray-100 p-5 transition transform hover:-translate-y-1"
            >
              {/* Title + Severity */}
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xl font-semibold text-red-600 flex items-center gap-2">
                  <FaExclamationTriangle /> {alert.type}
                </h3>
                {getSeverityBadge(alert.severity)}
              </div>

              {/* Description */}
              <p className="text-gray-700 mb-3">{alert.description}</p>

              {/* Media */}
              {alert.file_type === "image" && alert.file_url && (
                <img
                  src={alert.file_url}
                  alt="Alert Visual"
                  className="w-full h-52 object-cover rounded-lg mb-3"
                />
              )}
              {alert.file_type === "video" && alert.file_url && (
                <video
                  controls
                  src={alert.file_url}
                  className="w-full h-52 rounded-lg mb-3"
                />
              )}

              {/* Location & Reporter Info */}
              <div className="space-y-2 text-sm text-gray-600">
                <p className="flex items-center gap-2">
                  <FaMapMarkerAlt className="text-gray-500" />
                  {alert.location_text
                    ? `${alert.location_text} (${alert.latitude}, ${alert.longitude})`
                    : alert.latitude && alert.longitude
                    ? `${alert.latitude}, ${alert.longitude}`
                    : "Unknown location"}
                </p>
                <p className="flex items-center gap-2">
                  <FaUser className="text-gray-500" /> Reported by:{" "}
                  <span className="font-medium">{alert.name || "Anonymous"}</span>
                </p>
                <p className="flex items-center gap-2">
                  <FaPhone className="text-gray-500" /> Contact:{" "}
                  <span className="font-medium">{alert.contact || "N/A"}</span>
                </p>
                <p className="flex items-center gap-2 text-gray-500">
                  <FaClock /> {new Date(alert.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertFeed;
