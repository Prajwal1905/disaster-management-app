import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Custom icons
const shelterIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/235/235861.png",
  iconSize: [32, 32],
});

const requestIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/484/484167.png",
  iconSize: [32, 32],
});

const ManageShelterPanel = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [shelters, setShelters] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchShelters = async () => {
    try {
      const res = await axios.get("/api/shelters");
      const approvedShelters = res.data.filter((s) => s.status === "approved");
      setShelters(approvedShelters);
    } catch {
      toast.error("Failed to load shelters");
    }
  };

  const fetchPendingShelterRequests = async () => {
    try {
      const res = await axios.get("/api/shelters/pending");
      setPendingRequests(res.data);
    } catch {
      toast.error("Failed to load pending requests");
    }
  };

  useEffect(() => {
    fetchShelters();
    fetchPendingShelterRequests();
  }, []);

  const handleShelterApproval = async (req, approve) => {
    const token = localStorage.getItem("token");

    if (!token || !token.includes(".")) {
      toast.error("Missing or invalid token. Please log in again.");
      console.error("Invalid token:", token);
      return;
    }

    try {
      await axios.patch(
        `/api/shelters/${req._id}/status`,
        { status: approve ? "approved" : "rejected" },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success(approve ? "✅ Shelter approved" : "❌ Shelter rejected");

      if (approve) {
        await fetchShelters();
      }

      setPendingRequests((prev) => prev.filter((item) => item._id !== req._id));
    } catch (err) {
      console.error(
        "Error approving/rejecting shelter:",
        err?.response?.data || err.message
      );
      toast.error("Action failed");
    }
  };

  // Filter shelters based on search input
  const filteredShelters = shelters.filter((shelter) => {
    const combined =
      `${shelter.name} ${shelter.orgName} ${shelter.address} ${shelter.contact}`.toLowerCase();
    return combined.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">🗺️ Shelter Map</h2>

      {/* Search Bar */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="🔍 Search shelters by name, address or contact..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded shadow"
        />
      </div>

      <div className="w-full" style={{ height: "80vh" }}>
        <MapContainer
          center={[20.5937, 78.9629]}
          zoom={5}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

          {/* Approved Shelters */}
          {filteredShelters.map((shelter) => {
            if (!shelter.latitude || !shelter.longitude) return null;
            return (
              <Marker
                key={shelter._id}
                position={[shelter.latitude, shelter.longitude]}
                icon={shelterIcon}
              >
                <Popup>
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>🏢 {shelter.orgName || shelter.name}</strong>
                    </p>
                    <p>📍 {shelter.address}</p>
                    <p>📞 {shelter.contact}</p>
                    <p>🛏 {shelter.capacity} beds</p>
                    <p>📝 {shelter.description || "No description"}</p>
                    {shelter.file && (
                      <img
                        src={`/static/uploads/${shelter.file}`} // ✅
                        alt="Shelter"
                        className="w-32 h-20 object-cover mt-2 rounded"
                      />
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Pending Requests */}
          {pendingRequests.map((req) => {
            const lat = req?.location?.latitude;
            const lng = req?.location?.longitude;
            if (!lat || !lng) return null;

            return (
              <Marker key={req._id} position={[lat, lng]} icon={requestIcon}>
                <Popup>
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>🆔</strong> {req._id}
                    </p>
                    <p>
                      <strong>Org:</strong> {req.orgName}
                    </p>
                    <p>
                      <strong>Email:</strong> {req.email}
                    </p>
                    <p>
                      <strong>📞 Contact:</strong> {req.contact}
                    </p>
                    <p>
                      <strong>🛏️ Description:</strong> {req.description}
                    </p>
                    <p>
                      <strong>👥 Capacity:</strong> {req.capacity}
                    </p>
                    <p>
                      <strong>📍 Address:</strong> {req.address}
                    </p>
                    {req.file && (
                      <img
                        src={`/static/uploads/${req.file}`} // ✅ This matches Flask's static folder setup
                        alt="Shelter"
                        className="w-32 h-20 object-cover mt-2 rounded"
                      />
                    )}
                    <div className="mt-2 flex gap-2">
                      <button
                        className="bg-green-600 text-white px-2 py-1 rounded"
                        onClick={() => handleShelterApproval(req, true)}
                      >
                        ✅ Approve
                      </button>
                      <button
                        className="bg-red-600 text-white px-2 py-1 rounded"
                        onClick={() => handleShelterApproval(req, false)}
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
};

export default ManageShelterPanel;
