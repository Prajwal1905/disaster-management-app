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

export const saveReportOffline = async (report) => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.put({ ...report, id: Date.now() }); // Use timestamp as unique ID
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject("Failed to save report offline");
  });
};

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

export const syncReports = async () => {
  if (!navigator.onLine) return;

  const reports = await getAllReports();
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
      if (report.file) {
        formData.append("file", report.file);
      }

      await fetch("/api/hazard-report", {
        method: "POST",
        body: formData,
      });
    } catch (err) {
      console.error("❌ Failed to sync one of the reports:", err);
      return; // Stop sync on first error
    }
  }

  await clearReports();
  console.log("✅ Offline reports synced and cleared");
};