import React, { useState, useEffect } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const CommunitySignup = () => {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    district: "",
    latitude: "",
    longitude: "",
  });

  // Auto-fetch location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude.toString();
          const lon = pos.coords.longitude.toString();

          setForm((prev) => ({
            ...prev,
            latitude: lat,
            longitude: lon,
          }));

          toast.success("Location fetched automatically!");

          // Reverse geocode to get district name
          try {
            const res = await axios.get(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`
            );
            const districtName =
              res.data.address.state_district ||
              res.data.address.county ||
              res.data.address.city ||
              "";
            setForm((prev) => ({
              ...prev,
              district: districtName,
            }));
          } catch (err) {
            console.error("Reverse geocoding failed", err);
          }
        },
        () => toast.error("Failed to fetch location")
      );
    } else {
      toast.error("Geolocation not supported");
    }
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/community/signup", form);
      toast.success("Signup successful!");
      setTimeout(() => (window.location.href = "/"), 2000);
    } catch (err) {
      toast.error(err.response?.data?.error || "Signup failed");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-xl shadow">
      <h2 className="text-xl font-bold mb-4">Community Alert Signup</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          name="name"
          placeholder="Name"
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />
        <input
          name="phone"
          placeholder="Phone"
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />

        <input
          name="district"
          placeholder="District"
          value={form.district}
          onChange={handleChange}
          className="w-full p-2 border rounded"
          required
        />

        <div className="flex gap-2">
          <input
            name="latitude"
            placeholder="Latitude"
            value={form.latitude}
            onChange={handleChange}
            className="w-1/2 p-2 border rounded"
            required
          />
          <input
            name="longitude"
            placeholder="Longitude"
            value={form.longitude}
            onChange={handleChange}
            className="w-1/2 p-2 border rounded"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-green-600 text-white p-2 rounded"
        >
          Submit
        </button>
      </form>
    </div>
  );
};

export default CommunitySignup;
