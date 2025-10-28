import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import axios from "axios";
import L from "leaflet";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { API_BASE_URL } from "../../config";


const sosIcon = L.divIcon({
  className: "sos-marker",
  html: `<div style="
      background: red;
      color: white;
      font-weight: bold;
      border-radius: 50%;
      width: 34px;
      height: 34px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      border: 2px solid white;
      box-shadow: 0 0 6px rgba(0,0,0,0.3);
    ">SOS</div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
});

const SuperAdminMapView = () => {
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: "All",
    severity: "All",
    risk: "All",
  });

  const seenAlertsRef = useRef(new Set()); // for SOS toast
  const riskCacheRef = useRef(new Map()); // { alertId -> {risk_level, risk_prob} }

  const fetchAlerts = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/report/all-alerts`);
      const activeAlerts = res.data.filter(
        (alert) => alert.status !== "resolved" && alert.status !== "fake"
      );

      const alertsWithRisk = await Promise.all(
        activeAlerts.map(async (alert) => {
          const alertId = alert._id;
          const lat = alert.latitude || alert.location?.coordinates?.[1];
          const lon = alert.longitude || alert.location?.coordinates?.[0];

          // SOS toast notification
          if (alert.type === "SOS" && !seenAlertsRef.current.has(alertId)) {
            seenAlertsRef.current.add(alertId);
            toast.error(
              `🚨 SOS Alert 🚨\n👤 Name: ${
                alert.name || "Unknown"
              }\n📞 Contact: ${
                alert.contact || "N/A"
              }\n📍 Location: Lat ${lat}, Lng ${lon}`,
              { autoClose: false }
            );
          }

          // Check cache first
          if (riskCacheRef.current.has(alertId)) {
            return { ...alert, ...riskCacheRef.current.get(alertId) };
          }

          // Fetch risk only for new alerts
          if (!lat || !lon) return alert;

          try {
            const riskRes = await axios.get(`${API_BASE_URL}/api/weather/predict_risk?lat=${lat}&lon=${lon}`);

            const riskData = {
              risk_level: riskRes.data.risk_level,
              risk_prob: riskRes.data.risk_probability,
            };
            riskCacheRef.current.set(alertId, riskData);
            return { ...alert, ...riskData };
          } catch {
            return { ...alert, risk_level: "Unknown", risk_prob: 0 };
          }
        })
      );

      setAlerts(alertsWithRisk);
      setFilteredAlerts(alertsWithRisk);
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter alerts
  useEffect(() => {
    let filtered = [...alerts];
    if (filters.type !== "All")
      filtered = filtered.filter((a) => a.type === filters.type);
    if (filters.severity !== "All")
      filtered = filtered.filter((a) => a.severity === filters.severity);
    if (filters.risk !== "All")
      filtered = filtered.filter((a) => a.risk_level === filters.risk);
    setFilteredAlerts(filtered);
  }, [filters, alerts]);

  const getMarkerIcon = (alert) => {
    if (alert.type === "SOS") return sosIcon;

    let color = "gray";
    switch (alert.risk_level) {
      case "Critical":
        color = "red";
        break;
      case "High":
        color = "orange";
        break;
      case "Medium":
        color = "yellow";
        break;
      case "Low":
        color = "green";
        break;
      default:
        color = "gray";
    }

    return L.divIcon({
      className: "custom-div-icon",
      html: `<div style="font-size:24px; color:${color}">${
        alert.type === "Fire" ? "🔥" : alert.type === "Flood" ? "🌊" : "🚨"
      }</div>`,
      iconSize: [30, 42],
      iconAnchor: [15, 42],
    });
  };

  const getSeverityClass = (severity) => {
    if (!severity) return "text-gray-600";
    switch (severity.toLowerCase()) {
      case "high":
        return "text-red-600 font-semibold";
      case "medium":
        return "text-yellow-600 font-semibold";
      case "low":
        return "text-green-600 font-semibold";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="h-screen w-full">
      <div className="p-2 flex gap-4">
        <select
          className="border p-1"
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        >
          <option value="All">All Types</option>
          <option value="Fire">Fire</option>
          <option value="Flood">Flood</option>
          <option value="SOS">SOS</option>
          <option value="Other">Other</option>
        </select>

        <select
          className="border p-1"
          value={filters.severity}
          onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
        >
          <option value="All">All Severities</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>

        <select
          className="border p-1"
          value={filters.risk}
          onChange={(e) => setFilters({ ...filters, risk: e.target.value })}
        >
          <option value="All">All Risk Levels</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center pt-20 text-xl">Loading map...</div>
      ) : (
        <MapContainer
          center={[19.076, 72.8777]}
          zoom={11}
          className="h-full w-full z-0"
        >
          <TileLayer
            attribution='&copy; <a href="http://osm.org">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filteredAlerts.map((alert) => {
            const lat = parseFloat(alert.latitude);
            const lng = parseFloat(alert.longitude);
            if (isNaN(lat) || isNaN(lng)) return null;

            return (
              <Marker
                key={alert._id}
                position={[lat, lng]}
                icon={getMarkerIcon(alert)}
              >
                <Popup>
                  <div>
                    <strong>
                      {alert.type === "SOS"
                        ? "🚨 SOS Emergency 🚨"
                        : alert.type}
                    </strong>
                    <p>
                      <b>Severity: </b>
                      <span className={getSeverityClass(alert.severity)}>
                        {alert.severity || "N/A"}
                      </span>
                    </p>
                    <p>
                      <b>Risk Level: </b> {alert.risk_level || "Unknown"} (
                      {alert.risk_prob || 0})
                    </p>
                    <p>{alert.description}</p>
                    {alert.file_url &&
                      (alert.file_type === "image" ? (
                        <img
                          src={alert.file_url}
                          alt="alert"
                          className="w-40 h-auto mt-2"
                        />
                      ) : (
                        <video
                          controls
                          src={alert.file_url}
                          className="w-40 h-auto mt-2"
                        />
                      ))}
                    <p>
                      <b>Location:</b> Lat {lat}, Lng {lng}
                    </p>
                    <p>
                      <b>Time:</b> {new Date(alert.timestamp).toLocaleString()}
                    </p>
                    {alert.name && (
                      <p>
                        <b>Reported by:</b> {alert.name}
                      </p>
                    )}
                    {alert.contact && (
                      <p>
                        <b>Contact:</b> {alert.contact}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      )}
    </div>
  );
};

export default SuperAdminMapView;
