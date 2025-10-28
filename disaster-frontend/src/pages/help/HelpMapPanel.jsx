import React, { useEffect, useState } from "react";
import axios from "axios";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { API_BASE_URL } from "../../config";

const redPinIcon = new L.Icon({
  iconUrl: "/red-pin.png",
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  popupAnchor: [0, -40],
});

const blackPinIcon = new L.Icon({
  iconUrl: "/black_pin.png",
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  popupAnchor: [0, -40],
});
const bluePinIcon = new L.Icon({
  iconUrl: "/blue-pin.png",
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  popupAnchor: [0, -40],
});

const HelpMapPanel = () => {
  const [requests, setRequests] = useState([]);
  const [helps, setHelps] = useState([]);
  const [filter, setFilter] = useState("assigned_pending");

  const [processingTasks, setProcessingTasks] = useState({});
  const user = JSON.parse(localStorage.getItem("helpUser"));
  const userEmail = user?.email?.toLowerCase();

  useEffect(() => {
    const assignedReq = JSON.parse(localStorage.getItem("assignedRequest"));
    const assignedHelpers = JSON.parse(localStorage.getItem("assignedHelpers"));

    if (assignedReq) {
      setRequests([assignedReq]);
      localStorage.removeItem("assignedRequest");
    } else {
      fetchRequests();
    }

    if (assignedHelpers) {
      setHelps(assignedHelpers);
      localStorage.removeItem("assignedHelpers");
    } else {
      fetchHelps();
    }
  }, [filter]);

  const fetchRequests = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("helpUser"));
      if (!user?.email) {
        console.warn("No helpUser found in localStorage.");
        return;
      }

      // fetch both pending and in_progress together
      const res = await axios.get(
        `${API_BASE_URL}/api/help_assist/my_assigned_pending?email=${user.email}&status=both`
      );

      setRequests(res.data);
    } catch (err) {
      console.error("Error fetching assigned refugee requests:", err);
    }
  };

  const fetchHelps = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/help_assist`);

      setHelps(res.data);
    } catch (err) {
      console.error("Error fetching help assistance locations:", err);
    }
  };

  const completeTask = async (reqId) => {
    try {
      await axios.post(
        `${API_BASE_URL}/api/help_assist/complete-task/${reqId}`,
        {
          email: user.email,
        }
      );

      // Remove from list, but assumed saved in backend/history
      setRequests((prev) => prev.filter((r) => r._id !== reqId));
      setProcessingTasks((prev) => {
        const copy = { ...prev };
        delete copy[reqId];
        return copy;
      });
    } catch (err) {
      console.error(
        "Failed to complete task",
        err.response?.data || err.message
      );
    }
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-[calc(100vh-4rem)]">
      {/* Filter Dropdown */}
      <div className="absolute top-4 left-4 z-[1000] bg-white shadow px-2 py-1 rounded">
        <label className="font-semibold mr-2">Filter:</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="assigned_pending">Pending</option>
          <option value="in_progress">In Progress</option>
        </select>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white shadow px-4 py-2 rounded text-sm space-y-1">
        <p>
          <span className="inline-block w-3 h-3 bg-red-600 rounded-full mr-2"></span>
          Refugee Request
        </p>
        <p>
          <span className="inline-block w-3 h-3 bg-black rounded-full mr-2"></span>
          Help Location
        </p>
        <p>
          <span className="inline-block w-3 h-3 bg-blue-600 rounded-full mr-2"></span>
          Your Help Location
        </p>
      </div>

      {/* Map */}
      <MapContainer
        center={[19.7515, 75.7139]} // Default center (Maharashtra)
        zoom={7}
        scrollWheelZoom={true}
        className="h-full w-full z-0"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {/* Red Markers: Assigned Requests */}
        {requests.map((req) => {
          const lat = req.location?.lat ?? req.location?.latitude;
          const lng = req.location?.lng ?? req.location?.longitude;
          const isInProgress = req.status === "in_progress";
          const isBeingHandledByMe =
            req.handled_by?.toLowerCase() === user?.email?.toLowerCase();
          const isHandledBySomeoneElse =
            req.status === "in_progress" &&
            !isBeingHandledByMe &&
            req.handled_by;

          const isAssignedToMe = req.assigned_candidates?.includes(user?.email);
          const handleTask = async (reqId) => {
            setProcessingTasks((prev) => ({ ...prev, [reqId]: true }));
            try {
              await axios.post(`${API_BASE_URL}/api/help_assist/handle-task/${reqId}`, { email: user.email });

              await fetchRequests(); // ⬅️ Ensure data refreshes with new 'handled_by'
            } catch (err) {
              console.error(
                "Failed to handle task",
                err.response?.data || err.message
              );
            } finally {
              setProcessingTasks((prev) => {
                const copy = { ...prev };
                delete copy[reqId];
                return copy;
              });
            }
          };

          return lat && lng ? (
            <Marker
              key={`req-${req._id}`}
              position={[lat, lng]}
              icon={redPinIcon}
            >
              <Popup>
                <div className="text-sm">
                  <p>🆔 ID: {req._id}</p>
                  <p>👤 Name: {req.name}</p>
                  <p>📞 Contact: {req.contact}</p>
                  <p>📍 Address: {req.address}</p>
                  <p>🧾 Description: {req.description}</p>
                  <p>🕐 Reported: {new Date(req.timestamp).toLocaleString()}</p>
                  <p>📌 Status: {req.status}</p>

                  <p>👥 Assigned To:</p>
                  <ul className="list-disc list-inside ml-2">
                    {req.assigned_candidates?.map((email, idx) => (
                      <li key={idx}>{email}</li>
                    ))}
                  </ul>

                  {/* Case 1: Task is not yet handled and assigned to me */}
                  {req.status === "assigned_pending" &&
                    req.assigned_candidates?.includes(userEmail) &&
                    !req.handled_by && (
                      <button
                        className="mt-2 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 w-full"
                        onClick={() => handleTask(req._id)}
                      >
                        Handle Task
                      </button>
                    )}

                  {/* Case 2: Task is being handled by me */}
                  {req.status === "in_progress" &&
                    req.handled_by?.toLowerCase() === userEmail && (
                      <>
                        <p className="mt-2 text-yellow-700 font-semibold">
                          Processing by you
                        </p>
                        <button
                          className="mt-2 bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 w-full"
                          onClick={() => completeTask(req._id)}
                        >
                          Complete
                        </button>
                      </>
                    )}

                  {/* Case 3: Task is in progress by someone else but assigned to me */}
                  {req.status === "in_progress" &&
                    req.assigned_candidates?.includes(userEmail) &&
                    req.handled_by?.toLowerCase() !== userEmail && (
                      <p className="mt-2 text-yellow-700 font-semibold">
                        Processing by {req.handled_by}
                      </p>
                    )}
                </div>
              </Popup>
            </Marker>
          ) : null;
        })}

        {/* Black Markers: Help Assistance */}
        {helps.map((help) => {
          const lat = help.location?.lat ?? help.location?.latitude;
          const lng = help.location?.lng ?? help.location?.longitude;
          const isSelf = help.email === user?.email;

          return lat && lng ? (
            <Marker
              key={`help-${help._id}`}
              position={[lat, lng]}
              icon={isSelf ? bluePinIcon : blackPinIcon}
            >
              <Popup>
                <div className="space-y-1 text-sm">
                  <p>
                    <strong>🏥 Assistance:</strong> {help.name || "Unnamed"}
                  </p>
                  <p>
                    <strong>📧 Email:</strong> {help.email || "Not Provided"}
                  </p>
                  <p>
                    <strong>📞 Contact:</strong>{" "}
                    {help.contact || "Not Provided"}
                  </p>
                  <p>
                    <strong>📍 Address:</strong>{" "}
                    {help.address || "Not Provided"}
                  </p>
                  <p>
                    <strong>📝 Description:</strong>{" "}
                    {help.description || "Not Provided"}
                  </p>
                  <p>
                    <strong>🆔 ID:</strong> {help._id}
                  </p>
                  {help.image && (
                    <img
                      src={`/static/uploads/${help.image.replace(/\\/g, "/")}`}
                      alt="Assistance"
                      className="w-40 h-24 object-cover rounded"
                    />
                  )}
                </div>
              </Popup>
            </Marker>
          ) : null;
        })}
      </MapContainer>
    </div>
  );
};

export default HelpMapPanel;
