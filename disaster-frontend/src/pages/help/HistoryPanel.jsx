import React, { useEffect, useState } from "react";
import axios from "axios";

const HistoryPanel = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem("helpUser"));
  const userEmail = user?.email?.toLowerCase();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = localStorage.getItem("helpToken");

        const res = await axios.get("/api/help/history", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const filtered = res.data
          .filter(
            (item) =>
              item.status === "resolved" &&
              item.handled_by?.toLowerCase() === userEmail
          )
          .sort((a, b) => new Date(b.resolvedAt) - new Date(a.resolvedAt));

        setHistory(filtered);
      } catch (error) {
        console.error("Error fetching help history:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userEmail) fetchHistory();
  }, [userEmail]);

  if (loading) return <p>Loading history...</p>;
  if (history.length === 0) return <p>No past requests handled yet.</p>;

  return (
    <div className="p-2">
      <h2 className="text-lg font-semibold mb-4">📜 Handled Requests</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {history.map((item) => (
          <div
            key={item._id}
            className="bg-white border rounded-xl p-3 shadow-sm text-sm"
          >
            <p><strong>👤</strong> {item.name}</p>
            <p><strong>📞</strong> {item.contact}</p>
            <p><strong>📍</strong> {item.address}</p>
            <p><strong>📝</strong> {item.description}</p>
            <p><strong>👥</strong> {item.assigned_candidates?.join(", ")}</p>
            <p><strong>🧑‍💼</strong> {item.handled_by || "N/A"}</p>
            <p><strong>⏳</strong> {item.inProgressAt ? new Date(item.inProgressAt).toLocaleString() : "N/A"}</p>
            <p><strong>✅</strong> {item.resolvedAt ? new Date(item.resolvedAt).toLocaleString() : "N/A"}</p>

            {item.file_url && (
              <img
                src={item.file_url.replace(/\\/g, "/")}
                alt="Evidence"
                className="mt-2 w-full h-32 object-cover rounded-md border"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistoryPanel;
