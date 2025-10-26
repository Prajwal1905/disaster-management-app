import React, { useState } from "react";
import RegisterAuthority from "./RegisterAuthorities";
import ShowAuthorities from "./ShowAuthorities";

const ManageAuthorities = () => {
  const [activeTab, setActiveTab] = useState("register");

  return (
    <div className="p-4">
      <div className="flex gap-4 mb-4">
        <button
          className={`px-4 py-2 rounded ${activeTab === "register" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          onClick={() => setActiveTab("register")}
        >
          Register Authority
        </button>
        <button
          className={`px-4 py-2 rounded ${activeTab === "show" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          onClick={() => setActiveTab("show")}
        >
          Show Authorities
        </button>
      </div>

      {activeTab === "register" ? <RegisterAuthority /> : <ShowAuthorities />}
    </div>
  );
};

export default ManageAuthorities;
