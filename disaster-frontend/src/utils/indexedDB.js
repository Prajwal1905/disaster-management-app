import { API_BASE_URL } from "../config"; // ✅ Use your config.js base URL

const DB_NAME = "DisasterReportsDB";
const STORE_NAME = "reports";

export const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject("Failed to open IndexedDB");
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
};

// ✅ Save hazard report locally when offline
export const saveReportOffline = async (report) => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.put({ ...report, id: Date.now() }); // Timestamp as unique ID

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject("Failed to save report offline");
  });
};

// ✅ Get all locally saved reports
export const getAllReports = async () => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject("Failed to fetch offline reports");
  });
};

// ✅ Clear all offline drafts
export const clearReports = async () => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.clear();
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject("Failed to clear reports");
  });
};

// ✅ Sync offline data to backend when online
export const syncReports = async () => {
  if (!navigator.onLine) return; // Skip if offline

  const reports = await getAllReports();
  if (reports.length === 0) return;

  console.log(`🔄 Syncing ${reports.length} offline reports...`);

  for (const report of reports) {
    try {
      const formData = new FormData();
      formData.append("name", report.name);
      formData.append("contact", report.contact);
      formData.append("type", report.type);
      formData.append("description", report.description);
      formData.append("latitude", report.latitude);
      formData.append("longitude", report.longitude);
      formData.append("location", report.address);

      // ✅ Ensure file is handled correctly (Blob/File)
      if (report.file instanceof Blob) {
        formData.append("file", report.file, report.file.name || "upload.jpg");
      }

      // ✅ Use API_BASE_URL for consistent backend routing
      const response = await fetch(`${API_BASE_URL}/api/hazard-report`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
    } catch (err) {
      console.error("❌ Failed to sync one of the reports:", err);
      return; // Stop sync on first failure
    }
  }

  await clearReports();
  console.log("✅ All offline reports synced successfully and cleared");
};
