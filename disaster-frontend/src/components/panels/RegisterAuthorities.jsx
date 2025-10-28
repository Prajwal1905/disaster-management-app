import React, { useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import axios from "axios";
import toast from "react-hot-toast";
import { API_BASE_URL } from "../../config";


// Default center (India)
const defaultCenter = [20.5937, 78.9629];

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
});

const LocationPicker = ({ onLocationSelect }) => {
  useMapEvents({
    click(e) {
      onLocationSelect([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
};

const RegisterAuthority = () => {
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    gender: "",
    role: "",
    district: "",
    address: "",
    email: "",
    password: "",
    phone: "",
    location: defaultCenter,
    faceImage: null,
  });

  const [showCamera, setShowCamera] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLocationSelect = (coords) => {
    setFormData({ ...formData, location: coords });
  };

  const startCamera = () => {
    setShowCamera(true);
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch(() => toast.error("Camera access denied"));
  };

  const captureFace = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    const imageDataUrl = canvas.toDataURL("image/png"); // Base64 string
    setCapturedPreview(imageDataUrl);
    setFormData({ ...formData, faceImage: imageDataUrl }); // base64 string

    toast.success("Face captured successfully ✅");
    video.srcObject.getTracks().forEach((track) => track.stop());
    setShowCamera(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.faceImage) {
      toast.error("Please capture the face image before submitting.");
      return;
    }
    if (!formData.location || formData.location.length !== 2) {
      toast.error("Please select a location on the map.");
      return;
    }

    const [lat, lng] = formData.location;
    const payload = {
      ...formData,
      location: {
        type: "Point",
        coordinates: [lng, lat], // IMPORTANT: GeoJSON uses [lng, lat]
      },
    };

    try {
      await axios.post(`${API_BASE_URL}/api/register-authority`, payload);
      toast.success("Authority registered successfully");

      setFormData({
        name: "",
        age: "",
        gender: "",
        role: "",
        district: "",
        address: "",
        email: "",
        password: "",
        phone: "",
        location: defaultCenter,
        faceImage: null,
      });
      setCapturedPreview(null);
    } catch (err) {
      console.error("Registration error:", err.response || err.message || err);
      toast.error(err.response?.data?.error || "Failed to register authority");
    }
  };

  return (
    <div className="relative p-4 space-y-6">
      <h2 className="text-2xl font-semibold mb-2">Register Authority</h2>

      {/* Form and Map layout */}
      <div
        className={`flex flex-col lg:flex-row gap-6 transition ${
          showCamera ? "pointer-events-none blur-sm select-none" : ""
        }`}
      >
        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="w-full lg:w-1/2 bg-white shadow p-6 rounded space-y-4"
        >
          {[
            "name",
            "age",
            "email",
            "password",
            "phone",
            "district",
            "address",
          ].map((field) => (
            <input
              key={field}
              type={field === "password" ? "password" : "text"}
              name={field}
              value={formData[field]}
              onChange={handleChange}
              placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
              className="w-full border p-2 rounded"
              required
            />
          ))}

          <select
            name="gender"
            value={formData.gender}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          >
            <option value="">Select Gender</option>
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
          </select>

          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            required
          >
            <option value="">Select Role</option>
            <option value="police_services">Police</option>
            <option value="fire_brigade">Fire</option>
            <option value="ndrf">NDRF</option>
            <option value="ambulance_services">Ambulance</option>
          </select>

          <button
            type="button"
            onClick={startCamera}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Capture Face
          </button>

          {capturedPreview && (
            <div className="mt-2">
              <p className="text-sm text-gray-500 mb-1">
                Captured Image Preview:
              </p>
              <img
                src={capturedPreview}
                alt="Captured Face"
                className="w-32 h-32 object-cover rounded shadow"
              />
            </div>
          )}

          <button
            type="submit"
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Register Authority
          </button>
        </form>

        {/* Map */}
        <div className="w-full lg:w-1/2 h-[400px]">
          <h2 className="text-lg mb-2">Select Authority Location</h2>
          <MapContainer
            center={formData.location}
            zoom={6}
            className="h-full rounded shadow"
          >
            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationPicker onLocationSelect={handleLocationSelect} />
            <Marker position={formData.location} />
          </MapContainer>
        </div>
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover absolute"
          />
          <button
            onClick={captureFace}
            className="absolute bottom-10 bg-white text-black px-6 py-2 rounded shadow"
          >
            Capture
          </button>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
};

export default RegisterAuthority;
