import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { saveReportOffline, syncReports } from "../utils/indexedDB";
import axios from "axios";
import { FaMapMarkerAlt, FaFileImage, FaFileVideo, FaInfoCircle } from "react-icons/fa";

const severityColors = {
  High: "text-red-700 font-bold",
  Medium: "text-yellow-600 font-semibold",
  Low: "text-green-600",
};

const ReportHazard = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    contact: "",
    type: "",
    description: "",
    file: null,
    latitude: "",
    longitude: "",
    address: "",
  });

  const [previewUrl, setPreviewUrl] = useState(null);
  const [isVideo, setIsVideo] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [addressCoords, setAddressCoords] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [severity, setSeverity] = useState(null);

  // Geocode address
  useEffect(() => {
    const geocodeAddress = async () => {
      if (form.address && (!form.latitude || !form.longitude)) {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
              form.address
            )}`
          );
          const data = await response.json();
          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            setAddressCoords([lat, lon]);
          }
        } catch (err) {
          console.error("Failed to geocode address:", err);
        }
      }
    };
    geocodeAddress();
  }, [form.address]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "file") {
      const file = files[0];
      if (!file) return;
      const isVid = file.type.startsWith("video/");
      setIsVideo(isVid);
      setPreviewUrl(URL.createObjectURL(file));
      setForm((prev) => ({ ...prev, file }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setShowMap(true);
        toast.success("📍 Location captured!");
      },
      () => toast.error("Unable to get location")
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      Object.keys(form).forEach((key) => {
        if (form[key]) formData.append(key, form[key]);
      });

      await axios.post("/api/report/hazard-report", formData);
      toast.success("✅ Hazard reported successfully!");

      // Reset form
      setForm({
        name: "",
        contact: "",
        type: "",
        description: "",
        file: null,
        latitude: "",
        longitude: "",
        address: "",
      });
      setPreviewUrl(null);
      setIsVideo(false);
      setAddressCoords(null);
      setShowMap(false);
    } catch (err) {
      console.error(err);
      toast.error("⚠️ Failed to submit hazard");
      if (!navigator.onLine) {
        await saveReportOffline({
          ...form,
          id: Date.now(),
          status: "pending",
          timestamp: new Date().toISOString(),
        });
        toast.success("Saved offline! Will sync when back online.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (navigator.onLine) syncReports();
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-6 mt-6 bg-gradient-to-r from-gray-50 via-white to-gray-50 rounded-xl shadow-xl">
      <h2 className="text-3xl font-bold mb-6 text-gray-800 flex items-center gap-2">
        📝 Report a Hazard
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            name="name"
            placeholder="Your Name"
            value={form.name}
            onChange={handleChange}
            required
            className="w-full md:w-1/2 border p-3 rounded-lg focus:ring-2 focus:ring-blue-400 transition"
          />
          <input
            type="tel"
            name="contact"
            placeholder="Contact Number"
            value={form.contact}
            onChange={handleChange}
            required
            pattern="[0-9]{10}"
            title="Enter a 10-digit mobile number"
            className="w-full md:w-1/2 border p-3 rounded-lg focus:ring-2 focus:ring-blue-400 transition"
          />
        </div>

        <select
          name="type"
          value={form.type}
          onChange={handleChange}
          required
          className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-400 transition"
        >
          <option value="">Select Hazard Type</option>
          <option value="Accident">Accident</option>
          <option value="Flood">Flood</option>
          <option value="Fire">Fire</option>
          <option value="Ambulance">Ambulance</option>
          <option value="Police">Police</option>
          <option value="Earthquake">Earthquake</option>
          <option value="Landslide">Landslide</option>
        </select>

        <textarea
          name="description"
          placeholder="Describe the hazard..."
          value={form.description}
          onChange={handleChange}
          required
          className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-400 transition h-28 resize-none"
        />

        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            name="address"
            placeholder="Enter address (optional)"
            value={form.address}
            onChange={handleChange}
            className="w-full md:w-2/3 border p-3 rounded-lg focus:ring-2 focus:ring-blue-400 transition"
          />
          <button
            type="button"
            onClick={handleLocation}
            className="w-full md:w-1/3 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            <FaMapMarkerAlt /> Get Location
          </button>
        </div>

        <div className="border-dashed border-2 border-gray-300 p-4 rounded-lg flex flex-col items-center justify-center text-gray-500">
          <label className="cursor-pointer flex flex-col items-center gap-2">
            {isVideo ? <FaFileVideo size={40} /> : <FaFileImage size={40} />}
            <span>{previewUrl ? "Change File" : "Upload Image/Video"}</span>
            <input
              type="file"
              name="file"
              accept="image/*,video/*"
              capture="environment"
              onChange={handleChange}
              className="hidden"
              required
            />
          </label>
          {previewUrl && (
            <div className="mt-3 w-full">
              {isVideo ? (
                <video src={previewUrl} controls className="w-full rounded-lg max-h-64" />
              ) : (
                <img src={previewUrl} alt="Preview" className="w-full rounded-lg max-h-64" />
              )}
            </div>
          )}
        </div>

        {showMap && (
          <div className="mt-4 h-64 rounded-lg overflow-hidden shadow-lg">
            <MapContainer
              center={
                form.latitude && form.longitude
                  ? [parseFloat(form.latitude), parseFloat(form.longitude)]
                  : addressCoords || [19.076, 72.8777]
              }
              zoom={15}
              scrollWheelZoom={false}
              className="h-full w-full"
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {form.latitude && form.longitude ? (
                <Marker position={[parseFloat(form.latitude), parseFloat(form.longitude)]} />
              ) : addressCoords ? (
                <Marker position={addressCoords} />
              ) : null}
            </MapContainer>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-red-600 hover:bg-red-700 text-white p-3 rounded-lg text-lg font-semibold transition flex items-center justify-center gap-2"
        >
          🚨 {isSubmitting ? "Submitting..." : "Submit Hazard"}
        </button>

        {severity && (
          <p className={`mt-2 text-center text-lg ${severityColors[severity]}`}>
            <FaInfoCircle className="inline mr-2" /> Severity: {severity}
          </p>
        )}
      </form>
    </div>
  );
};

export default ReportHazard;
