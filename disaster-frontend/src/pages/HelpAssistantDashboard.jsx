import React, { useState } from "react";
import {
  FaMapMarkedAlt,
  FaTasks,
  FaHandsHelping,
  FaUserFriends,
  FaCogs,
  FaUser,
  FaHistory,
} from "react-icons/fa";

import AssignedRequests from "./help/AssignedRequests";
import HelpMapPanel from "./help/HelpMapPanel";
import HelpProfile from "./help/HelpProfile";
import VolunteerManagement from "./help/VolunteerManagement";
import HistoryPanel from "./help/HistoryPanel";
const HelpAssistantDashboard = () => {
  const [selectedPanel, setSelectedPanel] = useState("assigned_requests");

  const renderPanelContent = () => {
    switch (selectedPanel) {
      case "assigned_requests":
        return <AssignedRequests />;
      case "volunteer_management":
        return <VolunteerManagement />;
      case "map_view":
        return <HelpMapPanel />;
      case "history":
        return <HistoryPanel />;

      case "profile":
        return <HelpProfile />;
      case "settings":
        return (
          <div className="p-6">
            <h2 className="text-xl font-bold">⚙️ Settings</h2>
            <p className="text-gray-500 mt-2">
              Settings panel under development.
            </p>
          </div>
        );
      default:
        return (
          <div className="p-6">
            <h2 className="text-xl font-bold capitalize">
              {selectedPanel.replace(/_/g, " ")}
            </h2>
            <p className="text-gray-500 mt-2">
              This panel is under construction.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow p-4 space-y-4 overflow-y-auto">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
          <FaHandsHelping /> Help Assistant
        </h2>

        <button
          onClick={() => setSelectedPanel("assigned_requests")}
          className="flex items-center gap-2 w-full p-2 rounded hover:bg-gray-100"
        >
          <FaTasks /> Assigned Requests
        </button>

        <button
          onClick={() => setSelectedPanel("volunteer_management")}
          className="flex items-center gap-2 w-full p-2 rounded hover:bg-gray-100"
        >
          <FaUserFriends /> Volunteer Management
        </button>

        <button
          onClick={() => setSelectedPanel("map_view")}
          className="flex items-center gap-2 w-full p-2 rounded hover:bg-gray-100"
        >
          <FaMapMarkedAlt /> Map View
        </button>

        <button
          onClick={() => setSelectedPanel("history")}
          className="flex items-center gap-2 w-full p-2 rounded hover:bg-gray-100"
        >
          <FaHistory /> History
        </button>

        <button
          onClick={() => setSelectedPanel("profile")}
          className="flex items-center gap-2 w-full p-2 rounded hover:bg-gray-100"
        >
          <FaUser /> My Profile
        </button>

        <button
          onClick={() => setSelectedPanel("settings")}
          className="flex items-center gap-2 w-full p-2 rounded hover:bg-gray-100"
        >
          <FaCogs /> Settings
        </button>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 overflow-y-auto">{renderPanelContent()}</main>
    </div>
  );
};

export default HelpAssistantDashboard;
