// src/components/Sidebar.jsx

import React from "react";

const Sidebar = ({ setActiveTab }) => {
  return (
    <div className="w-64 h-screen bg-gray-800 text-white p-4">
      <h2 className="text-lg font-bold mb-4">⚠️ Authority Panel</h2>
      <ul className="space-y-3">
        <li
          onClick={() => setActiveTab("map")}
          className="cursor-pointer hover:bg-gray-700 p-2 rounded"
        >
          🗺️ Live Alert Map
        </li>
        <li
          onClick={() => setActiveTab("resolved")}
          className="cursor-pointer hover:bg-gray-700 p-2 rounded"
        >
          📄 All Alerts
        </li>
        <li
          onClick={() => setActiveTab("send")}
          className="cursor-pointer hover:bg-gray-700 p-2 rounded"
        >
          🚨 Send Alert
        </li>
        <li
          onClick={() => setActiveTab("profile")}
          className="cursor-pointer hover:bg-gray-700 p-2 rounded"
        >
          👤 Profile
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;
