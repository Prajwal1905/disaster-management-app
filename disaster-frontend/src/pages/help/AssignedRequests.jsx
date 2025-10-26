import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const AssignedRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const prevRequestIds = useRef(new Set());

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem("helpUser"));
      if (userData?.email) {
        setEmail(userData.email);
      } else {
        toast.error("User not logged in or missing email.");
      }
    } catch (err) {
      toast.error("Failed to read user data.");
    }
  }, []);

  useEffect(() => {
    if (!email) return;

    const fetchAssignedRequests = async () => {
      try {
        const token = localStorage.getItem("helpToken");
        const res = await axios.get("/api/help_assist/assigned_requests", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const newRequests = res.data || [];

        const newIds = new Set(newRequests.map((r) => r._id));
        newRequests.forEach((r) => {
          if (!prevRequestIds.current.has(r._id)) {
            toast.info(
              `📌 New assigned request: ${r.description || "No description"}`
            );
          }
        });

        prevRequestIds.current = newIds;
        setRequests(newRequests);
      } catch (error) {
        console.error("Failed to fetch assigned requests:", error);
        toast.error("Failed to fetch assigned requests");
      } finally {
        setLoading(false);
      }
    };

    fetchAssignedRequests();
    const interval = setInterval(fetchAssignedRequests, 10000);
    return () => clearInterval(interval);
  }, [email]);

  return (
    <div className="p-3 sm:p-6">
      <h2 className="text-xl font-semibold mb-4">📝 Assigned Refugee Requests</h2>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : requests.length === 0 ? (
        <p className="text-gray-500">No requests assigned to you yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {requests.map((req) => (
            <div
              key={req._id}
              className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm text-sm"
            >
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-semibold text-blue-600 text-base">
                  🆘 {req.description || "No Description"}
                </h3>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    req.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : req.status === "assigned"
                      ? "bg-blue-100 text-blue-800"
                      : req.status === "assigned_pending"
                      ? "bg-purple-100 text-purple-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {req.status || "N/A"}
                </span>
              </div>

              <p className="text-gray-700 mb-0.5">
                📍 <strong>Address:</strong> {req.address || "N/A"}
              </p>
              <p className="text-gray-700 mb-0.5">
                🧭 <strong>Coords:</strong> {req.location?.latitude || "N/A"},{" "}
                {req.location?.longitude || "N/A"}
              </p>
              <p className="text-gray-700 mb-0.5">
                📞 <strong>Contact:</strong> {req.contact || "N/A"}
              </p>
              <p className="text-gray-700 mb-0.5">
                👤 <strong>Name:</strong> {req.name || "N/A"}
              </p>

              <p className="text-xs text-gray-500 mt-1">
                ⏱️{" "}
                {req.timestamp
                  ? new Date(req.timestamp).toLocaleString()
                  : "Timestamp not available"}
              </p>

              {req.file_url && (
                <img
                  src={req.file_url.replace(/\\/g, "/")}
                  alt="Refugee Request"
                  className="mt-2 w-full h-32 object-cover rounded"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/fallback.png";
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssignedRequests;
