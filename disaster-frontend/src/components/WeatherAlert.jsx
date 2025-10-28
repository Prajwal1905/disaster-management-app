// src/components/WeatherAlert.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { API_BASE_URL } from "../config";

const RISK_STYLES = {
  Critical: "bg-red-600 text-white animate-pulse-glow",
  High: "bg-orange-500 text-white animate-pulse-glow",
  Medium: "bg-yellow-300 text-black animate-pulse-glow-soft",
  Low: "bg-green-300 text-black",
};


const WeatherAlert = () => {
  const [weather, setWeather] = useState(null);
  const [alert, setAlert] = useState(null);
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [coords, setCoords] = useState({ lat: null, lon: null });

  const fetchWeather = async (lat, lon) => {
    if (lat == null || lon == null) return;
    setCoords({ lat, lon });

    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/weather?lat=${lat}&lon=${lon}`);

      if (res.data.weather) {
        const fixedWeather = {
          ...res.data.weather,
          wind_speed: (res.data.weather.wind_speed * 3.6).toFixed(1),
        };
        setWeather(fixedWeather);
      }
      setAlert(res.data.alert || null);

      const riskRes = await axios.get(`${API_BASE_URL}/api/weather/predict_risk?lat=${lat}&lon=${lon}`);
      setRisk(riskRes.data || null);
    } catch (error) {
      console.error("Error fetching weather/risk:", error);
      setLocationError("Error fetching weather or risk data.");
    } finally {
      setLoading(false);
    }
  };

  const initWeather = () => {
    let intervalId;

    const success = (pos) => {
      const { latitude, longitude } = pos.coords;
      fetchWeather(latitude, longitude);
      intervalId = setInterval(() => fetchWeather(latitude, longitude), 5 * 60 * 1000);
    };

    const error = (err) => {
      console.error("Location error:", err);
      setLocationError("Unable to fetch location. Showing fallback city.");
      fetchWeather(18.5204, 73.8567);
      intervalId = setInterval(() => fetchWeather(18.5204, 73.8567), 5 * 60 * 1000);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(success, error);
    } else {
      setLocationError("Geolocation not supported. Showing fallback city.");
      fetchWeather(18.5204, 73.8567);
      intervalId = setInterval(() => fetchWeather(18.5204, 73.8567), 5 * 60 * 1000);
    }

    return () => clearInterval(intervalId);
  };

  useEffect(() => {
    const cleanup = initWeather();
    return cleanup;
  }, []);

  if (loading) return <p className="text-gray-500">Fetching weather data...</p>;

  return (
    <div className="w-full max-w-xl space-y-4">
      {/* 🔴 Hazard Alert Banner */}
      {alert && (
        <div className="bg-red-600 text-white text-center py-3 px-4 rounded-lg animate-pulse flex items-center justify-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-semibold">{alert.message}</span>
        </div>
      )}

      {/* Weather + Risk Card */}
      {weather && (
        <div
          className={`shadow-md rounded-xl p-5 transition ${
            alert ? "bg-red-50 border border-red-400" : "bg-white"
          }`}
        >
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">
              {weather.location} {weather.district ? `(${weather.district})` : ""}
            </h2>
            <button
              onClick={() => fetchWeather(coords.lat, coords.lon)}
              className="text-gray-500 hover:text-gray-800"
            >
              <RefreshCw size={18} />
            </button>
          </div>

          <div className="flex items-center gap-4 mt-3">
            <img
              src={`http://openweathermap.org/img/wn/${weather.icon}@2x.png`}
              alt="Weather Icon"
              className="w-16 h-16"
            />
            <div>
              <p className="text-xl font-semibold">
                🌡 {weather.temp}°C{" "}
                <span className="text-gray-600 text-sm">
                  (Feels like {weather.feels_like}°C)
                </span>
              </p>
              <p className="capitalize">{weather.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-4 text-sm text-gray-700">
            <p>💧 Humidity: {weather.humidity}%</p>
            <p>💨 Wind: {weather.wind_speed} km/h</p>
            <p>☁ Clouds: {weather.clouds}%</p>
            <p>📊 Pressure: {weather.pressure} hPa</p>
            <p>🌅 Sunrise: {weather.sunrise}</p>
            <p>🌇 Sunset: {weather.sunset}</p>
          </div>

          {/* ML Risk Display with Dynamic Glow */}
          {risk && (
            <div
              className={`mt-4 p-3 rounded-lg text-sm flex justify-between items-center ${
                RISK_STYLES[risk.risk_level] || "bg-gray-200 text-black"
              }`}
            >
              <span>
                ⚠ Risk Level: <strong>{risk.risk_level}</strong> (
                {Math.round(risk.risk_probability * 100)}%)
              </span>
            </div>
          )}
        </div>
      )}

      {/* Location Error */}
      {locationError && (
        <div className="text-yellow-700 bg-yellow-100 p-3 rounded-lg text-sm flex justify-between items-center">
          <span>{locationError}</span>
          <button
            onClick={initWeather}
            className="ml-3 px-3 py-1 bg-yellow-500 text-white rounded-md text-xs"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

export default WeatherAlert;
