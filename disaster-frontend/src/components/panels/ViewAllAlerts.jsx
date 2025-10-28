import React, { useEffect, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { API_BASE_URL } from "../../config";


const ViewAllAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [statusFilter, setStatusFilter] = useState("active");
  const [pincode, setPincode] = useState("");

  const fetchAlerts = async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (pincode) params.pincode = pincode;

      const res = await axios.get(`${API_BASE_URL}/api/superadmin/alerts`, { params });
      setAlerts(res.data);
    } catch (err) {
      toast.error("Error fetching alerts");
      console.error(err);
    }
  };

  const confirmAction = (message) =>
    new Promise((resolve) => {
      toast(
        (t) => (
          <div className="flex flex-col gap-2">
            <span>{message}</span>
            <div className="flex justify-end gap-2">
              <button
                className="bg-gray-300 px-2 py-1 rounded"
                onClick={() => toast.dismiss(t.id)}
              >
                Cancel
              </button>
              <button
                className="bg-red-600 text-white px-2 py-1 rounded"
                onClick={() => {
                  resolve(true);
                  toast.dismiss(t.id);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        ),
        { duration: Infinity }
      );
    });

  const deleteAlert = async (id) => {
    const confirmed = await confirmAction("Delete this alert?");
    if (!confirmed) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/superadmin/alerts/${id}`);
      toast.success("Alert deleted successfully");
      fetchAlerts();
    } catch (err) {
      toast.error("Failed to delete alert");
      console.error(err);
    }
  };

  const resolveAlert = async (id) => {
    const confirmed = await confirmAction("Mark this alert as resolved?");
    if (!confirmed) return;

    try {
      await axios.patch(`${API_BASE_URL}/api/superadmin/alerts/${id}/resolve`);
      toast.success("Alert resolved successfully");
      fetchAlerts();
    } catch (err) {
      toast.error("Failed to resolve alert");
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter, pincode]);

  return (
    <div className="p-4">
      <Toaster position="top-right" />
      <h2 className="text-xl font-bold mb-4">📢 View All Alerts</h2>

      <div className="flex gap-4 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="resolved">Resolved</option>
        </select>

        <input
          type="text"
          placeholder="Filter by Pincode"
          value={pincode}
          onChange={(e) => setPincode(e.target.value)}
          className="border p-2 rounded"
        />

        <button
          onClick={fetchAlerts}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border bg-white rounded shadow">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Title</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">District</th>
              <th className="p-2 text-left">Timestamp</th>
              <th className="p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert) => (
              <tr key={alert._id} className="border-t hover:bg-gray-50">
                <td className="p-2">{alert.title}</td>
                <td className="p-2">{alert.type}</td>
                <td className="p-2">{alert.status}</td>
                <td className="p-2">{alert.district}</td>
                <td className="p-2">
                  {new Date(alert.timestamp).toLocaleString()}
                </td>
                <td className="p-2 space-x-2">
                  {alert.status !== "resolved" && (
                    <button
                      onClick={() => resolveAlert(alert._id)}
                      className="px-2 py-1 border border-green-600 text-green-600 rounded"
                    >
                      Resolve
                    </button>
                  )}
                  <button
                    onClick={() => deleteAlert(alert._id)}
                    className="px-2 py-1 border border-red-600 text-red-600 rounded"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {alerts.length === 0 && (
              <tr>
                <td colSpan="6" className="p-4 text-center text-gray-500">
                  No alerts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ViewAllAlerts;
