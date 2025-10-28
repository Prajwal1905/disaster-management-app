import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { API_BASE_URL } from "../../config";


const ITEMS_PER_PAGE = 10;

const ManageHelpAssistance = () => {
  const [requests, setRequests] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [viewMode, setViewMode] = useState("list");

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await axios.get("/api/superadmin/help-requests");
      const data = res.data || [];
      setRequests(data);
      applyFilters(data, searchTerm, sortOrder);
    } catch (err) {
      toast.error("Failed to load help assistance requests.");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (data, search = "", sort = "newest") => {
    let filteredData = data.filter(
      (item) =>
        item.orgName?.toLowerCase().includes(search.toLowerCase()) ||
        item.username?.toLowerCase().includes(search.toLowerCase())
    );

    filteredData.sort((a, b) =>
      sort === "newest"
        ? new Date(b.createdAt) - new Date(a.createdAt)
        : new Date(a.createdAt) - new Date(b.createdAt)
    );

    setFiltered(filteredData);
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    applyFilters(requests, val, sortOrder);
  };

  const handleSortChange = (e) => {
    const val = e.target.value;
    setSortOrder(val);
    applyFilters(requests, searchTerm, val);
  };

  const handleDecision = async (id, action) => {
    try {
      setProcessingId(id);
      await axios.post(`/api/superadmin/help-${action}`, { id });
      toast.success(`Request ${action}ed`);
      fetchRequests();
    } catch (err) {
      toast.error("Action failed");
    } finally {
      setProcessingId(null);
    }
  };

  const iconMap = {
    pending: new L.Icon({
      iconUrl: "/red-pin.png",
      iconSize: [30, 50],
      iconAnchor: [15, 50],
    }),
    approved: new L.Icon({
      iconUrl: "/black_pin.png",
      iconSize: [30, 50],
      iconAnchor: [15, 50],
    }),
    rejected: new L.Icon({
      iconUrl: "/graypin.png",
      iconSize: [30, 50],
      iconAnchor: [15, 50],
    }),
  };

  const createIcon = (status) => iconMap[status] || iconMap["pending"];

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">🆘 Help Assistance Requests</h2>

      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
        <input
          type="text"
          placeholder="🔍 Search by name or username"
          value={searchTerm}
          onChange={handleSearchChange}
          className="border p-2 rounded w-full md:w-1/2"
        />
        <select
          value={sortOrder}
          onChange={handleSortChange}
          className="border p-2 rounded"
        >
          <option value="newest">🆕 Newest First</option>
          <option value="oldest">📜 Oldest First</option>
        </select>

        <button
          onClick={() => setViewMode(viewMode === "list" ? "map" : "list")}
          className="ml-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {viewMode === "list" ? "🌍 Show Map" : "📄 Show List"}
        </button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500">No matching requests found.</p>
      ) : viewMode === "list" ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {paginated.map((item) => (
            <div
              key={item._id}
              className={`p-2 border rounded text-sm shadow-sm space-y-1 ${
                item.status === "pending" ? "bg-yellow-50" : "bg-gray-100"
              }`}
            >
              <h3 className="font-semibold truncate">{item.orgName}</h3>
              <p>
                <strong>🆔 ID:</strong> {item._id}
              </p>
              <p>
                <strong>🏢 Org Name:</strong> {item.orgName}
              </p>
              <p>
                <strong>👤 Username:</strong> {item.username}
              </p>
              <p>
                <strong>📧 Email:</strong> {item.email}
              </p>
              <p>
                <strong>📞 Contact:</strong> {item.contactInfo}
              </p>
              <p>
                <strong>📍 Address:</strong> {item.address}
              </p>
              <p>
                <strong>📝 Description:</strong> {item.description}
              </p>
              <p>
                <strong>🌐 Role:</strong> {item.role}
              </p>
              <p>
                <strong>🔖 Status:</strong> {item.status}
              </p>

              {item.image && (
                <img
                  src={`/static/uploads/photos/${item.image}`}
                  alt="preview"
                  className="mt-2 rounded w-full max-w-[180px]"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = "/default.png";
                  }}
                />
              )}

              {item.status === "pending" && (
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => handleDecision(item._id, "approve")}
                    className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700"
                    disabled={processingId === item._id}
                  >
                    {processingId === item._id ? "Approving..." : "Approve"}
                  </button>
                  <button
                    onClick={() => handleDecision(item._id, "reject")}
                    className="bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700"
                    disabled={processingId === item._id}
                  >
                    {processingId === item._id ? "Rejecting..." : "Reject"}
                  </button>
                </div>
              )}
            </div>
          ))}

          {totalPages > 1 && (
            <div className="flex justify-center mt-6 gap-2">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1 rounded border ${
                    currentPage === i + 1
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-700"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="h-[500px] w-full rounded shadow-md">
          <MapContainer
            center={[20.5937, 78.9629]}
            zoom={5}
            scrollWheelZoom
            className="h-full w-full"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
            />

            {requests
              .filter(
                (item) =>
                  item.role === "help_assist" &&
                  item.location?.lat &&
                  item.location?.lng
              )
              .map((item) => (
                <Marker
                  key={item._id}
                  position={[item.location.lat, item.location.lng]}
                  icon={createIcon(item.status)}
                >
                  <Popup minWidth={240}>
                    <div className="space-y-1 text-sm">
                      <p>
                        <strong>🆔 ID:</strong> {item._id}
                      </p>
                      <p>
                        <strong>🏢 Org:</strong> {item.orgName}
                      </p>
                      <p>
                        <strong>👤 Username:</strong> {item.username}
                      </p>
                      <p>
                        <strong>📧 Email:</strong> {item.email}
                      </p>
                      <p>
                        <strong>📞 Contact:</strong> {item.contactInfo}
                      </p>
                      <p>
                        <strong>📍 Address:</strong> {item.address}
                      </p>
                      <p>
                        <strong>📝 Description:</strong> {item.description}
                      </p>
                      <p>
                        <strong>🔖 Status:</strong> {item.status}
                      </p>
                      <p>
                        <strong>🌐 Role:</strong> {item.role}
                      </p>
                      {item.image && (
                        <img
                          src={`/static/uploads/photos/${item.image}`}
                          alt="preview"
                          className="mt-2 rounded w-full max-w-[180px]"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/default.png";
                          }}
                        />
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
          </MapContainer>
        </div>
      )}
    </div>
  );
};

export default ManageHelpAssistance;
