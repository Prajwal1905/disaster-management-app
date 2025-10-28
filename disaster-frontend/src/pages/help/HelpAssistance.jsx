import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../../config";

const HelpAssistance = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    contact: "",
    organization: "",
    address: "",
    description: "",
    location: null, // Initially null, will be set via GPS
    image: null,
  });
  const [preview, setPreview] = useState(null);
  const [nearbyAssistants, setNearbyAssistants] = useState([]);
  const navigate = useNavigate();

  // ----------------- Get user's current location -----------------
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            },
          }));
        },
        (error) => {
          console.error("Error getting location:", error);
          toast.error("Unable to get your location. Using default location.");
          // Fallback to a default location if needed
          setFormData((prev) => ({
            ...prev,
            location: { lat: 19.076, lng: 72.877 }, // Mumbai
          }));
        }
      );
    } else {
      console.error("Geolocation not supported by this browser.");
      toast.error("Geolocation not supported by your browser.");
      setFormData((prev) => ({
        ...prev,
        location: { lat: 19.076, lng: 72.877 },
      }));
    }
  }, []);

  // ----------------- Location picker for map -----------------
  const LocationPicker = () => {
    useMapEvents({
      click(e) {
        setFormData((prev) => ({
          ...prev,
          location: { lat: e.latlng.lat, lng: e.latlng.lng },
        }));
      },
    });
    return null;
  };

  // ----------------- Fetch nearby help assistants -----------------
  useEffect(() => {
    if (!formData.location || !formData.location.lat || !formData.location.lng)
      return;

    const fetchNearbyAssistants = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/help_assist?status=approved`
        );

        console.log("Assistants fetched:", res.data);
        console.log("User location:", formData.location);

        const haversine = (lat1, lon1, lat2, lon2) => {
          const R = 6371; // km
          const dLat = ((lat2 - lat1) * Math.PI) / 180;
          const dLon = ((lon2 - lon1) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos((lat1 * Math.PI) / 180) *
              Math.cos((lat2 * Math.PI) / 180) *
              Math.sin(dLon / 2) ** 2;
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return R * c;
        };

        const assistantsWithDistance = res.data.map((assistant) => {
          const loc = assistant.location || {};
          let distance_km = null;
          if (typeof loc.lat === "number" && typeof loc.lng === "number") {
            distance_km = haversine(
              formData.location.lat,
              formData.location.lng,
              loc.lat,
              loc.lng
            );
          }
          return { ...assistant, distance_km };
        });

        const nearby = assistantsWithDistance
          .filter((a) => a.distance_km !== null && a.distance_km <= 25)
          .sort((a, b) => a.distance_km - b.distance_km);

        setNearbyAssistants(nearby);
      } catch (err) {
        console.error("Failed to fetch nearby assistants:", err);
        toast.error("Failed to load nearby help assistants");
      }
    };

    fetchNearbyAssistants();
  }, [formData.location]);

  // ----------------- Form handlers -----------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData((prev) => ({ ...prev, image: file }));
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isLogin) {
        const payload = {
          username: formData.email,
          password: formData.password,
        };
        const res = await axios.post(
          `${API_BASE_URL}/api/help_assist/login`,
          payload
        );

        toast.success(res.data.message || "Logged in!");
        const user = {
          name: res.data.name || formData.name || "Help Assistant",
          email: res.data.email || formData.email,
          organization: res.data.organization || formData.organization || "",
          role: "helpAssistant",
        };
        localStorage.setItem("helpUser", JSON.stringify(user));
        localStorage.setItem("helpToken", res.data.token);
        navigate("/helpdashboard");
      } else {
        const registerForm = new FormData();
        registerForm.append("orgName", formData.organization);
        registerForm.append("username", formData.email);
        registerForm.append("email", formData.email);
        registerForm.append("password", formData.password);
        registerForm.append("address", formData.address);
        registerForm.append("contactInfo", formData.contact);
        registerForm.append("description", formData.description);
        registerForm.append("location", JSON.stringify(formData.location));
        if (formData.image) registerForm.append("image", formData.image);

        const res = await axios.post(
          `${API_BASE_URL}/api/help_assist/register`,
          registerForm,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );

        toast.success(res.data.message || "Submitted for approval");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Something went wrong");
    }
  };

  // ----------------- JSX -----------------
  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-gray-100 p-4">
      <div className="bg-white shadow-lg rounded-lg p-6 w-full max-w-2xl space-y-4 mb-6">
        <h1 className="text-xl font-bold text-center">
          🤝 Help Assistance {isLogin ? "Login" : "Registration"}
        </h1>

        <div className="flex justify-center space-x-4 mb-4">
          <button
            onClick={() => setIsLogin(true)}
            className={`px-4 py-2 rounded ${
              isLogin ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`px-4 py-2 rounded ${
              !isLogin ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            Register
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          encType="multipart/form-data"
        >
          {!isLogin && (
            <>
              <div>
                <label className="font-medium block">Organization Name</label>
                <input
                  type="text"
                  name="organization"
                  value={formData.organization}
                  onChange={handleChange}
                  required
                  className="w-full border px-3 py-2 rounded"
                />
              </div>

              <div>
                <label className="font-medium block">Contact Number</label>
                <input
                  type="text"
                  name="contact"
                  value={formData.contact}
                  onChange={handleChange}
                  required
                  className="w-full border px-3 py-2 rounded"
                />
              </div>

              <div>
                <label className="font-medium block">Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  className="w-full border px-3 py-2 rounded"
                />
              </div>

              <div>
                <label className="font-medium block">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full border px-3 py-2 rounded"
                  rows={3}
                />
              </div>

              <div>
                <label className="font-medium block">Profile Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full"
                />
                {preview && (
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-20 h-20 mt-2 rounded-full object-cover"
                  />
                )}
              </div>

              <div>
                <label className="font-medium block">
                  Pick Location on Map
                </label>
                <div className="h-64 w-full mb-2">
                  <MapContainer
                    center={
                      formData.location
                        ? [formData.location.lat, formData.location.lng]
                        : [19.076, 72.877]
                    }
                    zoom={13}
                    className="h-full w-full rounded"
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <LocationPicker />
                    {formData.location && (
                      <Marker
                        position={[
                          formData.location.lat,
                          formData.location.lng,
                        ]}
                      />
                    )}
                  </MapContainer>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="font-medium block">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <div>
            <label className="font-medium block">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full border px-3 py-2 rounded"
            />
          </div>

          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded w-full hover:bg-blue-700"
          >
            {isLogin ? "Login" : "Submit for Approval"}
          </button>
        </form>
      </div>

      {/* ----------------- Nearby Help Assistants ----------------- */}
      <div className="w-full max-w-3xl">
        <h2 className="text-xl font-bold mb-4">Nearby Help Assistants</h2>
        {nearbyAssistants.length === 0 ? (
          <p className="text-gray-500">No nearby assistants found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {nearbyAssistants.map((assistant) => (
              <div
                key={assistant._id?.toString() || Math.random()}
                className="bg-white shadow rounded-lg p-4 border border-gray-100"
              >
                <div className="flex items-center space-x-4">
                  {assistant.image ? (
                    <img
                      src={assistant.image}
                      alt={assistant.orgName || assistant.username}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
                      ?
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-lg">
                      {assistant.orgName || assistant.username || "Unknown"}
                    </h3>
                    {assistant.username && (
                      <p className="text-sm text-gray-500">
                        {assistant.username}
                      </p>
                    )}
                    {assistant.address && (
                      <p className="text-sm text-gray-500">
                        {assistant.address}
                      </p>
                    )}
                    <p className="text-sm text-gray-500">
                      📍{" "}
                      {assistant.distance_km
                        ? `${assistant.distance_km.toFixed(1)} km away`
                        : "Distance unknown"}
                    </p>
                  </div>
                </div>
                {assistant.description && (
                  <p className="mt-2 text-gray-700">{assistant.description}</p>
                )}
                {assistant.contactInfo && (
                  <p className="mt-1 text-sm text-gray-500">
                    📞 {assistant.contactInfo}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HelpAssistance;
