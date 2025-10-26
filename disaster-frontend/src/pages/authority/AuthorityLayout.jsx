// src/pages/authority/AuthorityLayout.jsx

import React, { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar";
import LiveAlertMap from "./LiveAlertmap";
import AuthorityProfile from "./Profile";
import ResolvedAlerts from "./AllAlerts";
import SendAlertPage from "./SendAlert";

const AuthorityLayout = () => {
  const [activeTab, setActiveTab] = useState("map");

  useEffect(() => {
    setActiveTab("map"); // default on load
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case "map":
        return <LiveAlertMap />;
      case "resolved":
        return <ResolvedAlerts />;
      case "profile":
        return <AuthorityProfile />;
      case "send":
        return <SendAlertPage />;
      default:
        return <LiveAlertMap />;
    }
  };

  return (
    <div className="flex">
      <Sidebar setActiveTab={setActiveTab} />
      <div className="flex-1 p-4">{renderContent()}</div>
    </div>
  );
};

export default AuthorityLayout;
