import React, { useEffect, useState } from "react";
import axios from "axios";

const HelpProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("helpUser");
    if (!storedUser) return;

    const user = JSON.parse(storedUser);
    if (user?.email) {
      fetchProfile(user.email);
    } else {
      console.warn("Invalid user object in localStorage");
    }
  }, []);

  const fetchProfile = async (email) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`/api/help_assist/profile?email=${email}`);
      setProfile(res.data);
    } catch (err) {
      console.error("❌ Failed to fetch profile:", err);
      setError("Failed to load profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("helpUser");
    localStorage.removeItem("helpToken");
    window.location.href = "http://localhost:3000/";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px] text-lg font-semibold">
        ⏳ Loading profile...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-4 bg-white shadow-md rounded mt-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={() => {
            const storedUser = localStorage.getItem("helpUser");
            if (!storedUser) return;
            const user = JSON.parse(storedUser);
            fetchProfile(user.email);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow-md rounded mt-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">👤 Help Assistant Profile</h2>
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition"
          title="Logout"
        >
          Logout
        </button>
      </div>

      {profile ? (
        <div className="space-y-3 text-sm sm:text-base">
          <p>
            <strong>📧 Email:</strong> {profile.email ?? "N/A"}
          </p>
          <p>
            <strong>👤 Username:</strong> {profile.username ?? "N/A"}
          </p>
          <p>
            <strong>📞 Contact:</strong> {profile.contactInfo ?? "N/A"}
          </p>
          <p>
            <strong>🏢 Organization:</strong> {profile.orgName ?? "N/A"}
          </p>
          <p>
            <strong>📍 Address:</strong> {profile.address ?? "N/A"}
          </p>
          <p>
            <strong>📝 Description:</strong> {profile.description ?? "N/A"}
          </p>
          <p>
            <strong>📌 Location:</strong> Lat {profile?.location?.lat}, Lng {profile?.location?.lng}
          </p>
          <p>
            <strong>🖼️ Image:</strong>{" "}
            {profile.image ? (
              <img
                src={`/static/uploads/refugees/${profile.image}`}
                alt="Uploaded"
                className="w-32 h-32 object-cover rounded"
              />
            ) : (
              "N/A"
            )}
          </p>
          <p>
            <strong>🔐 Role:</strong> {profile.role ?? "N/A"}
          </p>
        </div>
      ) : (
        <p className="text-red-500 font-medium">⚠️ Profile not found.</p>
      )}
    </div>
  );
};

export default HelpProfile;
