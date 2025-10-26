// src/components/BackButton.jsx

import React from "react";
import { useNavigate } from "react-router-dom";

const BackButton = () => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(-1)}
      className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow"
    >
      ⬅ Back
    </button>
  );
};

export default BackButton; // ✅ This line is required
