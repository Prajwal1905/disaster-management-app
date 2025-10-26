import React, { useEffect, useState } from "react";

const Profile = () => {
  const [authority, setAuthority] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("authorityUser");
    if (stored) setAuthority(JSON.parse(stored));
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">👤 Profile Info</h2>
      {authority ? (
        <div className="bg-white p-4 rounded shadow">
          <p><strong>ID:</strong> {authority._id}</p>
          <p><strong>Name:</strong> {authority.name}</p>
          <p><strong>Role:</strong> {authority.role}</p>
          <p><strong>Location:</strong> {authority?.location?.coordinates?.join(", ")}</p>
        </div>
      ) : (
        <p>No profile data.</p>
      )}
    </div>
  );
};

export default Profile;
