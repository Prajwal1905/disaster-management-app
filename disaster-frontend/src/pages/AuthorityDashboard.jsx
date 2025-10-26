// src/pages/AuthorityDashboard.jsx
import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

const Sidebar = ({ role }) => (
  <div className="bg-gray-800 text-white w-60 h-screen p-4 fixed left-0 top-0">
    <h2 className="text-lg font-bold mb-6">Dashboard - {role}</h2>
    <nav className="flex flex-col gap-4">
      <Link to="/authority/map" className="hover:text-yellow-400">Live Alert Map</Link>
      <Link to="/authority/alerts" className="hover:text-yellow-400">All Alerts</Link>
      <Link to="/authority/send-alert" className="hover:text-yellow-400">Send Alert</Link>
      <Link to="/authority/profile" className="hover:text-yellow-400">Profile</Link>
      <Link to="/authority/logout" className="hover:text-yellow-400">Logout</Link>
    </nav>
  </div>
);

const AuthorityDashboard = () => {
  const [authority, setAuthority] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem("authorityUser");
    if (stored) {
      const parsed = JSON.parse(stored);
      setAuthority(parsed);
    } else {
      navigate("/authority/login");
    }
  }, []);

  return (
    <div className="flex">
      <Sidebar role={authority?.role || "Loading..."} />
      <main className="flex-1 ml-60 p-6">
        <Outlet /> {/* Renders nested routes here */}
      </main>
    </div>
  );
};

export default AuthorityDashboard;
