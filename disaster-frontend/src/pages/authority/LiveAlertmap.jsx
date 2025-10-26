import React, { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Icon } from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import toast from "react-hot-toast";
import { ROLE_TO_TYPES } from "../../utils/hazardMapping";
import { io } from "socket.io-client";

// Icons
const authorityIcon = new Icon({
  iconUrl: "/black-pin.png",
  iconSize: [30, 30],
});
const alertIcon = new Icon({ iconUrl: "/red-pin.png", iconSize: [30, 30] });

const ROLE_RADIUS = {
  ndrf: 250,
  ambulance_services: 5,
  fire_brigade: 15,
  police_services: 15,
};

const getPlayedAlertsFromStorage = () =>
  new Set(JSON.parse(localStorage.getItem("playedAlertIds") || "[]"));

const savePlayedAlertId = (id, status) => {
  if (status?.toLowerCase() === "resolved") return;
  const played = getPlayedAlertsFromStorage();
  played.add(id);
  localStorage.setItem("playedAlertIds", JSON.stringify([...played]));
};

const LiveAlertMap = () => {
  const [authorityLocation, setAuthorityLocation] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [sendingHelpIds, setSendingHelpIds] = useState([]);
  const [helpSentIds, setHelpSentIds] = useState([]);
  const [userInteracted, setUserInteracted] = useState(false);
  const [focusedAlertId, setFocusedAlertId] = useState(null);
  const [ringingAlertId, setRingingAlertId] = useState(null);

  const prevAlertIds = useRef(getPlayedAlertsFromStorage());
  const storedAuthority = JSON.parse(localStorage.getItem("authorityUser"));
  const socket = useRef(null);
  const alarmAudio = useRef();
  const alarmTimeoutRef = useRef(null);
  const mapRef = useRef();

  useEffect(() => {
    const allowAudio = () => {
      if (alarmAudio.current) {
        alarmAudio.current
          .play()
          .then(() => {
            alarmAudio.current.pause(); // Pause immediately
            alarmAudio.current.currentTime = 0;
            setUserInteracted(true);
            console.log("✅ Audio permission unlocked");
          })
          .catch((e) => console.warn("❌ Audio unlock failed:", e.message));
      }
      document.removeEventListener("click", allowAudio);
    };

    document.addEventListener("click", allowAudio);
    return () => document.removeEventListener("click", allowAudio);
  }, []);

  useEffect(() => {
    const audio = new Audio("/alert.mp3");
    audio.muted = false;
    audio.preload = "auto";
    alarmAudio.current = audio;

    const tryUnlock = () => {
      audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          setUserInteracted(true);
          console.log("🔓 Audio unlocked");
        })
        .catch(() => {});
    };

    const handleClick = () => {
      tryUnlock();
      document.removeEventListener("click", handleClick);
    };

    document.addEventListener("click", handleClick);

    return () => {
      document.removeEventListener("click", handleClick);
    };
  }, []);

  useEffect(() => {
    if (!storedAuthority?.location) return;

    const { lat, lng } = storedAuthority.location;
    const { role } = storedAuthority;
    setAuthorityLocation({ lat, lon: lng });

    const radius = ROLE_RADIUS[role] || 10;
    const allowedTypes = ROLE_TO_TYPES[role] || [];

    axios
      .get(`/api/alerts?role=${role}&lat=${lat}&lon=${lng}`)
      .then((res) => {
        const fetched = Array.isArray(res.data) ? res.data : [];
        const filtered = fetched.filter((alert) => {
          if ((alert.status || "").toLowerCase() === "resolved") return false;
          const distance = getDistanceFromLatLonInKm(
            lat,
            lng,
            alert.latitude,
            alert.longitude
          );
          return (
            distance <= radius &&
            allowedTypes.includes((alert.type || "").toLowerCase())
          );
        });

        setAlerts(filtered);
        filtered.forEach((a) => {
          if (a.status?.toLowerCase() === "resolved") {
            prevAlertIds.current.add(a._id);
            savePlayedAlertId(a._id, a.status);
          }
        });

        if (filtered.length === 0 && alarmAudio.current) {
          alarmAudio.current.pause();
          alarmAudio.current.currentTime = 0;
          setRingingAlertId(null);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch alerts", err);
        toast.error("Error loading alerts");
      });
  }, []);

  useEffect(() => {
    socket.current = io("http://localhost:5000");

    socket.current.on("connect", () => console.log("🟢 Socket connected"));

    socket.current.on("new_alert", (data) => {
      if (!authorityLocation || !storedAuthority) return;
      if ((data.status || "").toLowerCase() === "resolved") return;

      const { lat, lon } = authorityLocation;
      const radius = ROLE_RADIUS[storedAuthority.role] || 10;
      const allowedTypes = ROLE_TO_TYPES[storedAuthority.role] || [];

      const isRelevant =
        allowedTypes.includes((data.type || "").toLowerCase()) &&
        getDistanceFromLatLonInKm(lat, lon, data.latitude, data.longitude) <=
          radius;

      const played = getPlayedAlertsFromStorage();
      if (played.has(data._id) || prevAlertIds.current.has(data._id)) return;

      if (isRelevant) {
        setAlerts((prev) => [data, ...prev]);
        setFocusedAlertId(data._id);
        toast.success("🚨 New nearby alert received");

        prevAlertIds.current.add(data._id);
        setRingingAlertId(data._id);

        if (userInteracted && alarmAudio.current) {
          const audio = alarmAudio.current;
          audio.muted = false;
          audio.currentTime = 0;

          audio
            .play()
            .then(() => {
              clearTimeout(alarmTimeoutRef.current);
              savePlayedAlertId(data._id, data.status);

              const currentAlertId = data._id;
              alarmTimeoutRef.current = setTimeout(() => {
                audio.pause();
                audio.currentTime = 0;
                setRingingAlertId((id) => (id === currentAlertId ? null : id));
              }, 10000);
            })
            .catch((e) => {
              console.warn("🔇 Alarm play failed:", e.message);
            });
        } else {
          console.warn("🚫 Alarm blocked until user clicks somewhere");
        }
      }
    });

    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, [authorityLocation, userInteracted]);

  useEffect(() => {
    if (!focusedAlertId || !mapRef.current) return;
    const alert = alerts.find((a) => a._id === focusedAlertId);
    if (alert) {
      mapRef.current.flyTo([alert.latitude, alert.longitude], 15, {
        animate: true,
        duration: 1.5,
      });
    }
    const timeout = setTimeout(() => setFocusedAlertId(null), 3000);
    return () => clearTimeout(timeout);
  }, [focusedAlertId, alerts]);

  const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
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

  const handleSendHelp = async (alertId) => {
    try {
      setSendingHelpIds((prev) => [...prev, alertId]);
      await axios.patch(`/api/alerts/help/${alertId}`);
      setHelpSentIds((prev) => [...prev, alertId]);
      toast.success("✅ Help sent");

      if (ringingAlertId === alertId && alarmAudio.current) {
        alarmAudio.current.pause();
        alarmAudio.current.currentTime = 0;
        clearTimeout(alarmTimeoutRef.current);
        setRingingAlertId(null);
      }
    } catch (err) {
      console.error("Send help error", err);
      toast.error("❌ Failed to send help");
    } finally {
      setSendingHelpIds((prev) => prev.filter((id) => id !== alertId));
    }
  };

  const handleResolveAlert = async (alertId) => {
    try {
      await axios.patch(`/api/alerts/${alertId}/resolve`);
      setAlerts((prev) => prev.filter((a) => a._id !== alertId));
      toast.success("✅ Alert resolved");

      const played = getPlayedAlertsFromStorage();
      played.delete(alertId);
      localStorage.setItem("playedAlertIds", JSON.stringify([...played]));
      prevAlertIds.current.delete(alertId);

      if (ringingAlertId === alertId && alarmAudio.current) {
        alarmAudio.current.pause();
        alarmAudio.current.currentTime = 0;
        clearTimeout(alarmTimeoutRef.current);
        setRingingAlertId(null);
      }
    } catch (err) {
      console.error("Resolve error", err);
      toast.error("❌ Failed to resolve alert");
    }
  };

  useEffect(() => {
    return () => {
      clearTimeout(alarmTimeoutRef.current);
      if (alarmAudio.current) {
        alarmAudio.current.pause();
        alarmAudio.current.currentTime = 0;
      }
    };
  }, []);

  return (
    <div className="w-full h-[90vh] relative">
      {authorityLocation ? (
        <MapContainer
          center={[authorityLocation.lat, authorityLocation.lon]}
          zoom={13}
          whenCreated={(mapInstance) => (mapRef.current = mapInstance)}
          style={{ width: "100%", height: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />
          <Marker
            position={[authorityLocation.lat, authorityLocation.lon]}
            icon={authorityIcon}
          >
            <Popup>You are here (Authority)</Popup>
          </Marker>

          {alerts.map((alert) => (
            <Marker
              key={alert._id}
              position={[alert.latitude, alert.longitude]}
              icon={alertIcon}
            >
              <Popup maxWidth={250}>
                <div className="text-sm space-y-1">
                  <p>
                    <strong>Type:</strong> {alert.type}
                  </p>
                  <p>
                    <strong>Severity:</strong>{" "}
                    <span
                      className={
                        alert.severity?.toLowerCase() === "high"
                          ? "text-red-600 font-semibold"
                          : alert.severity?.toLowerCase() === "medium"
                          ? "text-yellow-600 font-semibold"
                          : "text-green-600 font-semibold"
                      }
                    >
                      {alert.severity || "N/A"}
                    </span>
                  </p>
                  <p>
                    <strong>Description:</strong> {alert.description || "N/A"}
                  </p>
                  <p>
                    <strong>Name:</strong> {alert.name || "N/A"}
                  </p>
                  <p>
                    <strong>Contact:</strong> {alert.contact || "N/A"}
                  </p>
                  <p>
                    <strong>Latitude:</strong> {alert.latitude}
                  </p>
                  <p>
                    <strong>Longitude:</strong> {alert.longitude}
                  </p>
                  <p>
                    <strong>Time:</strong>{" "}
                    {new Date(alert.timestamp).toLocaleString()}
                  </p>

                  {alert.file_url && (
                    <img
                      src={alert.file_url}
                      alt="Alert"
                      className="mt-2 rounded w-full max-w-[200px]"
                    />
                  )}

                  {authorityLocation && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${authorityLocation.lat},${authorityLocation.lon}&destination=${alert.latitude},${alert.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline mt-2 block"
                    >
                      Navigate in Google Maps
                    </a>
                  )}

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleSendHelp(alert._id)}
                      disabled={
                        sendingHelpIds.includes(alert._id) ||
                        helpSentIds.includes(alert._id)
                      }
                      className={`px-3 py-1 rounded text-white ${
                        sendingHelpIds.includes(alert._id) ||
                        helpSentIds.includes(alert._id)
                          ? "bg-gray-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700"
                      }`}
                    >
                      {sendingHelpIds.includes(alert._id)
                        ? "Sending..."
                        : helpSentIds.includes(alert._id)
                        ? "Help Sent"
                        : "Send Help"}
                    </button>

                    <button
                      onClick={() => handleResolveAlert(alert._id)}
                      className="bg-green-600 px-2 py-1 text-white rounded hover:bg-green-700"
                    >
                      Resolve
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      ) : (
        <div className="text-center mt-20 text-gray-600 text-xl">
          📍 Loading your location...
        </div>
      )}
    </div>
  );
};

export default LiveAlertMap;
