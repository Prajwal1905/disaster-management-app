import React, { useEffect, useState } from "react";
import {
  getAllReports,
  clearReports,
  syncReports,
  openDB,
} from "../utils/indexedDB";
import toast from "react-hot-toast";
import {
  FaSync,
  FaTrash,
  FaMapMarkerAlt,
  FaVideo,
  FaImage,
  FaCheckCircle,
  FaExclamationCircle,
  FaSpinner,
} from "react-icons/fa";
import { API_BASE_URL } from "../config";


const STORE_NAME = "reports";

const OfflineDrafts = () => {
  const [reports, setReports] = useState([]);
  const [syncingId, setSyncingId] = useState(null);
  const [syncStatus, setSyncStatus] = useState({});

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    const data = await getAllReports();
    setReports(data.reverse());
  };

  const deleteOfflineReport = async (id) => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject("Failed to delete report");
    });
  };

  const handleDelete = async (id) => {
    await deleteOfflineReport(id);
    toast.success("Draft deleted");
    loadReports();
  };

  const handleSync = async (report) => {
    const id = report.id;
    setSyncingId(id);
    setSyncStatus((prev) => ({ ...prev, [id]: "pending" }));
    try {
      const formData = new FormData();
      formData.append("name", report.name);
      formData.append("contact", report.contact);
      formData.append("type", report.type);
      formData.append("description", report.description);
      formData.append("latitude", report.latitude);
      formData.append("longitude", report.longitude);
      formData.append("location", report.address);
      if (report.file) {
        formData.append("file", report.file);
      }

      await fetch(`${API_BASE_URL}/api/hazard-report`, {
        method: "POST",
        body: formData,
      });

      await deleteOfflineReport(id);
      setSyncStatus((prev) => ({ ...prev, [id]: "synced" }));
      toast.success("Synced successfully");
      loadReports();
    } catch (err) {
      console.error(err);
      setSyncStatus((prev) => ({ ...prev, [id]: "failed" }));
      toast.error("Sync failed. Please check your network.");
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncAll = async () => {
    try {
      await syncReports();
      toast.success("All drafts synced");
      loadReports();
    } catch (err) {
      toast.error("Sync failed. Check network.");
    }
  };

  const renderSyncStatus = (id) => {
    const status = syncStatus[id];
    if (syncingId === id) {
      return <FaSpinner className="animate-spin text-blue-500" title="Syncing..." />;
    }
    if (status === "synced") {
      return <FaCheckCircle className="text-green-500" title="Synced" />;
    }
    if (status === "failed") {
      return <FaExclamationCircle className="text-red-500" title="Sync Failed" />;
    }
    return <span className="text-gray-400 text-xs">Not Synced</span>;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Offline Drafts</h1>
        {reports.length > 0 && (
          <button
            onClick={handleSyncAll}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 flex items-center gap-2"
          >
            <FaSync /> Sync All
          </button>
        )}
      </div>

      {reports.length === 0 ? (
        <p className="text-gray-500">No offline drafts found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reports.map((report) => (
            <div key={report.id} className="bg-white p-4 rounded-xl shadow hover:shadow-md">
              <h2 className="font-bold text-lg mb-1">{report.description}</h2>

              <div className="text-sm text-gray-600 mb-2 flex items-center gap-2">
                <FaMapMarkerAlt className="text-red-500" />
                {report.latitude?.toFixed(4)}, {report.longitude?.toFixed(4)}
              </div>

              <div className="mb-2">
                {report.file && (
                  <>
                    {report.file.type?.startsWith("image") ? (
                      <img
                        src={URL.createObjectURL(report.file)}
                        alt="draft"
                        className="rounded-md h-40 object-cover"
                      />
                    ) : (
                      <video controls className="rounded-md h-40 object-cover">
                        <source src={URL.createObjectURL(report.file)} type={report.file.type} />
                      </video>
                    )}
                  </>
                )}
              </div>

              <div className="flex justify-between items-center mt-4 gap-2">
                <div>{renderSyncStatus(report.id)}</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSync(report)}
                    disabled={syncingId === report.id}
                    className={`bg-blue-600 text-white px-3 py-1 rounded text-sm flex items-center gap-1 ${
                      syncingId === report.id ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-700"
                    }`}
                  >
                    <FaSync /> Sync
                  </button>
                  <button
                    onClick={() => handleDelete(report.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm flex items-center gap-1"
                  >
                    <FaTrash /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OfflineDrafts;
