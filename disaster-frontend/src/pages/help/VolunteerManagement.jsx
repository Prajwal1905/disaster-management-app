import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const VolunteerManagement = () => {
  const navigate = useNavigate();
  const helpAssistantEmail =
    localStorage.getItem("email") || "admin@relief.com";

  const [groupName, setGroupName] = useState("");
  const [message, setMessage] = useState("");
  const [media, setMedia] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatorEmail, setCreatorEmail] = useState(helpAssistantEmail);
  const [duplicateWarning, setDuplicateWarning] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const groupsPerPage = 4;
  const groupNameRef = useRef(null);
  const indexOfLast = currentPage * groupsPerPage;
  const indexOfFirst = indexOfLast - groupsPerPage;
  const currentGroups = groups.slice(indexOfFirst, indexOfLast);

  const totalPages = Math.ceil(groups.length / groupsPerPage);

  // ✅ Moved fetchGroups out of useEffect so it's reusable
  const fetchGroups = async () => {
    try {
      const res = await axios.get("/api/volunteer-groups");
      setGroups(res.data || []);
      toast.success(`✅ Loaded ${res.data.length} active groups`);
    } catch (err) {
      console.error("Error loading groups", err);
      toast.error("❌ Failed to load groups.");
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchGroups();
  }, []);

  // Live duplicate validation
  useEffect(() => {
    if (!groupName || !creatorEmail) return;

    const exists = groups.find(
      (g) =>
        g.name.trim().toLowerCase() === groupName.trim().toLowerCase() &&
        g.creatorEmail.trim().toLowerCase() ===
          creatorEmail.trim().toLowerCase()
    );

    if (exists) {
      setDuplicateWarning(
        `❌ Group "${groupName}" already exists by this email.`
      );
    } else {
      setDuplicateWarning("");
    }
  }, [groupName, creatorEmail, groups]);

  // Group create handler
  const handleGroupCreate = async () => {
    if (!groupName || !message || !creatorEmail) {
      toast.error("⚠️ Please fill all required fields.");
      return;
    }

    const duplicate = groups.find(
      (g) =>
        g.name.trim().toLowerCase() === groupName.trim().toLowerCase() &&
        g.creatorEmail.trim().toLowerCase() ===
          creatorEmail.trim().toLowerCase()
    );

    if (duplicate) {
      toast.error(`❌ Group "${groupName}" already exists for ${creatorEmail}`);
      groupNameRef.current?.focus();
      return;
    }

    const formData = new FormData();
    formData.append("name", groupName);
    formData.append("message", message);
    formData.append("members", JSON.stringify([]));
    formData.append("creatorEmail", creatorEmail);
    if (media) formData.append("media", media);

    try {
      const res = await axios.post("/api/group", formData);
      const { inviteLink, name, _id } = res.data;

      toast.success(
        `✅ Group "${name}" created by ${creatorEmail}${
          media ? " with media 📎" : ""
        }`
      );
      toast(`📢 Invite Link: ${inviteLink}`, {
        icon: "🔗",
        duration: 8000,
      });

      // Reset form
      setGroupName("");
      setMessage("");
      setMedia(null);

      // ✅ Refresh group list
      await fetchGroups();

      navigate(`/admin/volunteer-group/${_id}`);
    } catch (err) {
      console.error("Error creating group:", err);
      toast.error("❌ Failed to create group.");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">🙋 Volunteer Management</h2>

      {/* Group Creation */}
      <div className="p-4 mb-6 bg-gray-100 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">
          📦 Create Volunteer Group
        </h3>

        <input
          type="text"
          ref={groupNameRef}
          placeholder="Enter group name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className={`p-2 border ${
            duplicateWarning ? "border-red-500" : "border-gray-300"
          } rounded w-full mb-2`}
        />

        <input
          type="email"
          placeholder="Enter creator email"
          value={creatorEmail}
          onChange={(e) => setCreatorEmail(e.target.value)}
          className="p-2 border border-gray-300 rounded w-full mb-2"
        />

        {duplicateWarning && (
          <p className="text-red-600 text-sm mb-2">{duplicateWarning}</p>
        )}

        <textarea
          placeholder="📨 Group message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="p-2 border border-gray-300 rounded w-full mb-2"
          rows={3}
        />

        <input
          type="file"
          accept="image/*,video/*"
          onChange={(e) => setMedia(e.target.files[0])}
          className="mb-2"
        />

        <button
          onClick={handleGroupCreate}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          ✅ Create Group
        </button>
      </div>

      {/* Active Groups Display */}
      <div>
        <h3 className="text-xl font-semibold mb-4">🟢 Active Groups</h3>
        {loading ? (
          <p>Loading groups...</p>
        ) : groups.length === 0 ? (
          <p>No active groups yet.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {currentGroups.map((group, index) => (
              <div
                key={index}
                className="bg-white shadow p-4 rounded border border-green-200 cursor-pointer hover:bg-gray-50 transition"
                onClick={() => navigate(`/admin/volunteer-group/${group._id}`)}
              >
                <h4 className="text-lg font-semibold">{group.name}</h4>
                <p className="text-sm mb-1">📝 {group.message}</p>
                <p className="text-sm">👤 Created by: {group.creatorEmail}</p>
                <p className="text-sm">
                  👥 Members: {group.members?.length || 0}
                </p>
                {group.inviteLink && (
                  <a
                    href={group.inviteLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline text-sm"
                    onClick={(e) => e.stopPropagation()}
                  >
                    📎 Group Invite
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VolunteerManagement;
