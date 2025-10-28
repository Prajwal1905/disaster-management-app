// SuperadminDashboard.jsx
import React, { useEffect, useState, useRef } from "react";
import { Bar } from "react-chartjs-2";
import {
  FaMapMarkedAlt,
  FaUserShield,
  FaBroadcastTower,
  FaBell,
  FaUsers,
  FaChartBar,
  FaHospital,
  FaBrain,
  FaCogs,
} from "react-icons/fa";

import ManageAuthorities from "../components/panels/ManageAuthorities"; // ✅ Panel for adding authority
import SendPublicAlert from "../components/panels/SendPublicAlert";
import ViewAllAlerts from "../components/panels/ViewAllAlerts";
import UsersAndAuthorities from "../components/panels/UsersAndAuthorities";
import ManageShelterPanel from "../components/panels/ManageShelterPanel";
import SuperAdminMapView from "../components/panels/SuperAdminMapView";
import RefugeeRequestsPanel from "../components/panels/RefugeeRequestsPanel";
import ManageHelpAssistance from "../components/panels/ManageHelpAssistance";
import { API_BASE_URL } from "../config";

const SuperadminDashboard = () => {
  const [alerts, setAlerts] = useState([]);
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState(false);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [selectedPanel, setSelectedPanel] = useState("map");

  const mapRef = useRef();
  const indiaCenter = [22.9734, 78.6569];

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/report/all-alerts`)
      .then((res) => res.json())
      .then((data) => {
        setAlerts(data);
        setFilteredAlerts(data);
      });
  }, []);

  useEffect(() => {
    let results = alerts;
    if (filterActive) {
      results = results.filter((a) => a.status !== "Resolved");
    }
    if (search) {
      results = results.filter((a) =>
        a.location?.toLowerCase().includes(search.toLowerCase())
      );
    }
    setFilteredAlerts(results);
  }, [search, filterActive, alerts]);

  const activeCount = alerts.filter((a) => a.status !== "Resolved").length;
  const resolvedCount = alerts.filter((a) => a.status === "Resolved").length;

  const renderPanelContent = () => {
    switch (selectedPanel) {
      case "manage_authorities":
        return <ManageAuthorities />;
      case "send_alert":
        return <SendPublicAlert />;
      case "all_alerts":
        return <ViewAllAlerts />;
      case "users_list":
        return <UsersAndAuthorities />;
      case "manage_shelters":
        return <ManageShelterPanel />;
      case "map":
        return <SuperAdminMapView />;
      case "refugee_requests":
        return <RefugeeRequestsPanel />;
      case "help_assistance":
        return <ManageHelpAssistance />;
      
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
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-72 bg-white shadow-lg p-4 space-y-4 overflow-y-auto">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
          <FaMapMarkedAlt /> Superadmin Panel
        </h2>

        <button
          onClick={() => setSelectedPanel("map")}
          className="flex items-center gap-2 w-full p-2 rounded hover:bg-gray-100"
        >
          <FaMapMarkedAlt /> Map View
        </button>

        <button
          onClick={() => setSelectedPanel("manage_authorities")}
          className="flex items-center gap-2 w-full p-2 rounded hover:bg-gray-100"
        >
          <FaUserShield /> Manage Authorities
        </button>

        <button
          onClick={() => setSelectedPanel("refugee_requests")}
          className="flex items-center gap-2 w-full p-2 rounded hover:bg-gray-100"
        >
          <FaBrain /> Refugee Requests
        </button>

        <button
          onClick={() => setSelectedPanel("help_assistance")}
          className="flex items-center gap-2 w-full p-2 rounded hover:bg-gray-100"
        >
          <FaUserShield /> Help Assistance Request
        </button>

        <button
          onClick={() => setSelectedPanel("send_alert")}
          className="flex items-center gap-2 w-full p-2 rounded hover:bg-gray-100"
        >
          <FaBroadcastTower /> Send Public Alert
        </button>

        <button
          onClick={() => setSelectedPanel("all_alerts")}
          className="flex items-center gap-2 w-full p-2 rounded hover:bg-gray-100"
        >
          <FaBell /> View All Alerts
        </button>

        <button
          onClick={() => setSelectedPanel("users_list")}
          className="flex items-center gap-2 w-full p-2 rounded hover:bg-gray-100"
        >
          <FaUsers /> Users & Authorities
        </button>

        <button
          onClick={() => setSelectedPanel("manage_shelters")}
          className="flex items-center gap-2 w-full p-2 rounded hover:bg-gray-100"
        >
          <FaHospital /> Manage Shelters
        </button>
        

        <button
          onClick={() => setSelectedPanel("settings")}
          className="flex items-center gap-2 w-full p-2 rounded hover:bg-gray-100"
        >
          <FaCogs /> Settings
        </button>
      </aside>

      {/* Main Panel */}
      <main className="flex-1">{renderPanelContent()}</main>
    </div>
  );
};

export default SuperadminDashboard;
