import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const ShelterApplicationForm = () => {
  const [formData, setFormData] = useState({
    orgName: "",
    contact: "",
    email: "",
    address: "",
    description: "",
    capacity: "",
    location: { lat: null, lng: null },
    file: null,
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    setFormData({ ...formData, file: e.target.files[0] });
  };

  const LocationMarker = () => {
    useMapEvents({
      click(e) {
        setFormData({ ...formData, location: e.latlng });
      },
    });

    return formData.location.lat ? (
      <Marker
        position={formData.location}
        icon={L.icon({
          iconUrl:
            "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
        })}
      />
    ) : null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.location.lat || !formData.location.lng) {
      toast.error("Please select a location on the map.");
      return;
    }

    const form = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      if (key === "location") {
        form.append("lat", value.lat);
        form.append("lng", value.lng);
      } else if (value !== null) {
        form.append(key, value);
      }
    });
    form.append("status", "pending");
    form.append("role", "shelter_application");

    try {
      await axios.post("/api/shelters/shelter-application", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Application submitted! Awaiting approval.");

      // Reset form
      setFormData({
        orgName: "",
        contact: "",
        email: "",
        address: "",
        description: "",
        capacity: "",
        location: { lat: null, lng: null },
        file: null,
      });
    } catch (err) {
      toast.error("Submission failed. Try again.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white mt-10 p-6 rounded-xl shadow">
      <h2 className="text-2xl font-bold mb-6">Shelter Application Form</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {[
          { label: "Organization Name", name: "orgName" },
          { label: "Email", name: "email", type: "email" },
          { label: "Contact Number", name: "contact" },
          { label: "Address", name: "address" },
          { label: "Description (what you provide)", name: "description" },
          {
            label: "Capacity (number of people)",
            name: "capacity",
            type: "number",
          },
        ].map(({ label, name, type = "text" }) => (
          <div key={name}>
            <label className="block font-medium mb-1">{label}</label>
            <input
              type={type}
              name={name}
              value={formData[name]}
              onChange={handleChange}
              className="w-full p-2 border border-gray-300 rounded"
              required
            />
          </div>
        ))}

        <div>
          <label className="block font-medium mb-1">
            Select Shelter Location on Map
          </label>
          <MapContainer
            center={[19.076, 72.8777]}
            zoom={12}
            style={{ height: "300px" }}
            className="rounded"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <LocationMarker />
          </MapContainer>
          {formData.location.lat && (
            <p className="text-sm mt-2 text-gray-600">
              Selected Location: {formData.location.lat.toFixed(5)},{" "}
              {formData.location.lng.toFixed(5)}
            </p>
          )}
        </div>

        <div>
          <label className="block font-medium mb-1">Upload Photo/Video</label>
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="w-full"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700"
        >
          Submit Application
        </button>
      </form>
    </div>
  );
};

export default ShelterApplicationForm;
