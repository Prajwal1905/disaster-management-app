import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { FaUsers, FaBell, FaSignOutAlt } from "react-icons/fa";
import { API_BASE_URL } from "../config";

const VolunteerFeed = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [volunteer, setVolunteer] = useState(null);
  const [groups, setGroups] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const savedVolunteer = localStorage.getItem("volunteer_user");
    if (savedVolunteer) {
      const parsed = JSON.parse(savedVolunteer);
      setVolunteer(parsed);
      fetchFeed(parsed.email);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      return toast.error("Please enter email and password");
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/api/volunteer-login`, {
        email,
        password,
      });

      const { volunteer } = res.data;
      setVolunteer(volunteer);
      localStorage.setItem("volunteer_user", JSON.stringify(volunteer));
      fetchFeed(volunteer.email);
      toast.success("Login successful");
    } catch (err) {
      toast.error(err.response?.data?.error || "Login failed");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("volunteer_user");
    setVolunteer(null);
    setEmail("");
    setPassword("");
    setGroups([]);
    setNotifications([]);
  };

  const fetchFeed = async (email) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/volunteer-groups`);
      const allGroups = res.data;
      const myGroups = allGroups.filter((g) => g.members.includes(email));
      const invites = allGroups.filter(
        (g) => !g.members.includes(email) && g.creatorEmail !== email
      );

      setGroups(myGroups);
      setNotifications(invites);
    } catch {
      toast.error("Failed to fetch feed");
    }
  };

  const handleJoinGroup = async (groupId) => {
    try {
      await axios.post(`${API_BASE_URL}/api/volunteer-groups/${groupId}/join`, {
        email: volunteer.email,
      });
      toast.success("Joined group!");
      fetchFeed(volunteer.email);
    } catch {
      toast.error("Failed to join group");
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {!volunteer ? (
        <form className="max-w-md mx-auto bg-white shadow-xl rounded-xl p-8 border border-gray-200" onSubmit={handleLogin}>
          <h2 className="text-2xl font-bold mb-6 text-center text-blue-700">Volunteer Login</h2>

          <input
            type="email"
            placeholder="Email"
            className="w-full border-gray-300 border rounded-lg px-4 py-2 mb-4 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full border-gray-300 border rounded-lg px-4 py-2 mb-4 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition"
          >
            Login
          </button>
        </form>
      ) : (
        <>
          <div className="flex justify-between items-center mb-6 bg-white shadow-md rounded-xl p-4 border border-gray-200">
            <h1 className="text-2xl font-bold text-gray-800">Welcome, {volunteer.name}</h1>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold"
            >
              <FaSignOutAlt /> Logout
            </button>
          </div>

          {/* Groups Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FaUsers /> My Groups
            </h2>
            {groups.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {groups.map((g) => (
                  <Link
                    to={`/volunteer/group/${g._id}`}
                    key={g._id}
                    className="p-4 bg-white shadow-lg rounded-xl border border-gray-200 hover:shadow-2xl transition flex flex-col justify-between"
                  >
                    <span className="text-lg font-bold text-blue-700">{g.name}</span>
                    <span className="text-sm text-gray-500 mt-2">Created by: {g.creatorEmail}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">You haven't joined any groups yet.</p>
            )}
          </div>

          {/* Notifications Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FaBell /> Notifications
            </h2>
            {notifications.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4">
                {notifications.map((n) => (
                  <div key={n._id} className="p-4 bg-white shadow-lg rounded-xl border border-gray-200 flex flex-col justify-between hover:shadow-2xl transition">
                    <span className="text-lg font-bold text-gray-800">{n.name}</span>
                    <p className="text-gray-600 mt-1">{n.message}</p>

                    {n.mediaUrl && (
                      <img
                        src={n.mediaUrl}
                        alt="group"
                        className="mt-2 max-h-48 w-full object-cover rounded-lg"
                      />
                    )}

                    {!groups.find((g) => g._id === n._id) && (
                      <button
                        onClick={() => handleJoinGroup(n._id)}
                        className="mt-3 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition"
                      >
                        Join Group
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No notifications at the moment.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default VolunteerFeed;
