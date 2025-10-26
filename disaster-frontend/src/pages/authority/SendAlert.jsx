import React, { useState } from "react";
import axios from "axios";

const SendAlert = () => {
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    const authorityUser = JSON.parse(localStorage.getItem("authorityUser"));

    try {
      await axios.post("http://localhost:5000/api/alerts/report", {
        type,
        description,
        authorityId: authorityUser?._id,
      });
      alert("Alert sent!");
      setType("");
      setDescription("");
    } catch (error) {
      console.error("Error sending alert", error);
      alert("Failed to send alert");
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">🚨 Send New Alert</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <input
          type="text"
          placeholder="Alert Type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          required
          className="w-full p-2 border rounded"
        />
        <textarea
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className="w-full p-2 border rounded"
        />
        <button type="submit" className="bg-red-600 text-white px-4 py-2 rounded">
          Send Alert
        </button>
      </form>
    </div>
  );
};

export default SendAlert;
