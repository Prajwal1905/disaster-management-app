import React from "react";
import { useNavigate } from "react-router-dom";
import ChatbotButton from "../components/ChatbotButton";
import WeatherAlert from "../components/WeatherAlert"; // ⬅️ Import here

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4 space-y-6">
      {/* Weather Alert at the top */}

      <h1 className="text-3xl font-bold text-center mb-6">
        🚨 Disaster Management Portal
      </h1>

      <button
        onClick={() => navigate("/user")}
        className="bg-blue-500 text-white px-6 py-3 rounded-xl shadow hover:bg-blue-600 w-full max-w-xs"
      >
        👤 Continue as User
      </button>

      <button
        onClick={() => navigate("/authority/login")}
        className="bg-green-500 text-white px-6 py-3 rounded-xl shadow hover:bg-green-600 w-full max-w-xs"
      >
        🛂 Authority Login
      </button>

      <button
        onClick={() => navigate("/help")}
        className="bg-purple-600 text-white px-6 py-3 rounded-xl shadow hover:bg-purple-700 w-full max-w-xs"
      >
        🤝 Help Register / Login
      </button>

      <button
        onClick={() => navigate("/superadmin/login")}
        className="bg-red-500 text-white px-6 py-3 rounded-xl shadow hover:bg-red-600 w-full max-w-xs"
      >
        🛡️ Super Admin Login
      </button>

      {/* ================= SIH Education & Drills Button ================= */}
      <button
        onClick={() => navigate("/education")}
        className="bg-yellow-500 text-white px-6 py-3 rounded-xl shadow hover:bg-yellow-600 w-full max-w-xs"
      >
        🎓 Education & Drills
      </button>
      {/* ================= /SIH Education & Drills Button ================= */}

      <WeatherAlert />

      <ChatbotButton />

    </div>
  );
};

export default Home;
