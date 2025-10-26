import React, { useEffect, useState } from "react";
import axios from "axios";
import moment from "moment";
import { toast } from "react-toastify";

const RefugeeRequestsPanel = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await axios.get("/api/help_assist/refugee_requests");
      setRequests(res.data);
    } catch (err) {
      console.error("Error fetching refugee requests:", err);
      toast.error("❌ Failed to load refugee requests.");
    } finally {
      setLoading(false);
    }
  };

  const assignToNearbyHelpers = async (req) => {
    try {
      const { latitude, longitude } = req.location || {};

      if (!latitude || !longitude) {
        toast.error("❌ Invalid location coordinates.");
        return;
      }

      await axios.post("/api/help_assist/nearby", {
        latitude,
        longitude,
        request_id: req.id,
      });

      toast.success("✅ Assigned to nearest help assistant (admin only)");
      fetchRequests();
    } catch (err) {
      console.error("Assignment error:", err);
      toast.error("❌ Assignment failed.");
    }
  };

  return (
    <div className="p-4 space-y-4">
      {loading ? (
        <p>Loading refugee requests...</p>
      ) : requests.length === 0 ? (
        <p className="text-gray-500">No refugee requests found.</p>
      ) : (
        requests.map((req, index) => (
          <div
            key={req._id || `${req.name}-${req.contact}-${index}`}
            className="bg-white p-4 rounded shadow space-y-2"
          >
            <p>
              <strong>👤 Name:</strong> {req.name}
            </p>
            <p>
              <strong>📞 Contact:</strong> {req.contact}
            </p>
            <p>
              <strong>📍 Address:</strong> {req.address}
            </p>
            <p>
              <strong>🧾 Description:</strong> {req.description}
            </p>
            {req.file_url && (
              <p>
                <strong>📂 Media:</strong>{" "}
                <a
                  href={req.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  View File
                </a>
              </p>
            )}
            <p>
              <strong>🕒 Time:</strong> {moment(req.timestamp).fromNow()}
            </p>
            <p>
              <strong>Status:</strong> {req.status}
            </p>
            {req.assigned_candidates?.length > 0 && (
              <p>
                <strong>🧑‍💼 Assigned Helpers:</strong>{" "}
                {req.assigned_candidates.join(", ")}
              </p>
            )}
            {req.status === "completed" && (
              <p className="text-green-600 font-semibold">
                ✅ Request Completed
              </p>
            )}
            {req.status === "assigned_pending" && (
              <p className="text-yellow-600 font-semibold">
                🕒 Awaiting Helper Confirmation
              </p>
            )}

            <button
              className={`mt-2 px-4 py-1 rounded text-white ${
                req.status === "assigned"
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
              onClick={() => assignToNearbyHelpers(req)}
              disabled={req.status !== "pending"}
            >
              🚚 Assign
            </button>
          </div>
        ))
      )}
    </div>
  );
};

export default RefugeeRequestsPanel;
