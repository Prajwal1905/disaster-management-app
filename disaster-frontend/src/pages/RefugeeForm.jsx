import React, { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const RefugeeForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
    description: "",
    address: "",
    latitude: "",
    longitude: "",
  });
  const [media, setMedia] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);

  const handleMediaChange = (e) => {
    const file = e.target.files[0];
    setMedia(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }
    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }));
        setLoadingLocation(false);
        toast.success("Location captured!");
      },
      (err) => {
        toast.error("Location access denied");
        setLoadingLocation(false);
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        payload.append(key, value);
      });
      if (media) payload.append("media", media);

      await axios.post("/api/refugee-help", payload);
      toast.success("Request submitted!");
      setFormData({
        name: "",
        contact: "",
        description: "",
        address: "",
        latitude: "",
        longitude: "",
      });
      setMedia(null);
      setPreview(null);
    } catch (err) {
      toast.error("Error submitting request");
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white shadow rounded-xl mt-8">
      <h2 className="text-2xl font-semibold mb-4 text-center text-blue-700">
        🆘 Refugee Assistance Request
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          required
          placeholder="Full Name"
          className="w-full border p-2 rounded"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        <input
          type="text"
          required
          placeholder="Contact Number"
          className="w-full border p-2 rounded"
          value={formData.contact}
          onChange={(e) =>
            setFormData({ ...formData, contact: e.target.value })
          }
        />
        <textarea
          required
          placeholder="Describe the situation, number of people, needs..."
          className="w-full border p-2 rounded"
          rows="4"
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
        />
        <input
          type="text"
          placeholder="Full Address (optional)"
          className="w-full border p-2 rounded"
          value={formData.address}
          onChange={(e) =>
            setFormData({ ...formData, address: e.target.value })
          }
        />
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Latitude"
            className="w-1/2 border p-2 rounded"
            value={formData.latitude}
            readOnly
          />
          <input
            type="text"
            placeholder="Longitude"
            className="w-1/2 border p-2 rounded"
            value={formData.longitude}
            readOnly
          />
        </div>
        <button
          type="button"
          onClick={handleLocation}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {loadingLocation ? "Getting location..." : "📍 Get Current Location"}
        </button>

        <input
          type="file"
          accept="image/*,video/*"
          className="w-full border p-2 rounded"
          onChange={handleMediaChange}
        />
        {preview && (
          <div className="mt-2">
            {media?.type.startsWith("video") ? (
              <video src={preview} controls className="w-full rounded" />
            ) : (
              <img src={preview} alt="Preview" className="w-full rounded" />
            )}
          </div>
        )}

        <button
          type="submit"
          className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          🚨 Submit Request
        </button>
      </form>
    </div>
  );
};

export default RefugeeForm;
