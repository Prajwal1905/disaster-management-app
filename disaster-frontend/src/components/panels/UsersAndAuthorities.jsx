import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../config";


const ITEMS_PER_PAGE = 6;

const UsersAndAuthorities = () => {
  const [users, setUsers] = useState([]);
  const [authorities, setAuthorities] = useState([]);
  const [searchUser, setSearchUser] = useState("");
  const [searchAuthority, setSearchAuthority] = useState("");
  const [userPage, setUserPage] = useState(1);
  const [authPage, setAuthPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, authoritiesRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/community/users`),
          axios.get(`${API_BASE_URL}/api/superadmin/authorities`),
        ]);
        setUsers(usersRes.data);
        setAuthorities(authoritiesRes.data);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      }
    };
    fetchData();
  }, []);

  // --- Filtered Data ---
  const filteredUsers = users.filter((user) =>
    user.name?.toLowerCase().includes(searchUser.toLowerCase()) ||
    user.phone?.includes(searchUser)
  );

  const filteredAuthorities = authorities.filter((auth) =>
    auth.name?.toLowerCase().includes(searchAuthority.toLowerCase()) ||
    auth.phone?.includes(searchAuthority)
  );

  // --- Paginate ---
  const paginatedUsers = filteredUsers.slice(
    (userPage - 1) * ITEMS_PER_PAGE,
    userPage * ITEMS_PER_PAGE
  );

  const paginatedAuthorities = filteredAuthorities.slice(
    (authPage - 1) * ITEMS_PER_PAGE,
    authPage * ITEMS_PER_PAGE
  );

  // --- Export to CSV ---
  const exportCSV = (data, filename) => {
    const csv = [
      Object.keys(data[0]).join(","),
      ...data.map((row) => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-center text-blue-800 mb-8">Community Overview</h1>

      {/* USERS SECTION */}
      <section className="mb-10">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold text-gray-700"> Registered Users</h2>
          <button
            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
            onClick={() => exportCSV(filteredUsers, "users.csv")}
          >
            Export CSV
          </button>
        </div>
        <input
          type="text"
          placeholder="Search users by name or phone"
          className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded mb-4"
          value={searchUser}
          onChange={(e) => {
            setSearchUser(e.target.value);
            setUserPage(1);
          }}
        />

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {paginatedUsers.map((user, index) => (
            <div key={index} className="bg-white shadow rounded-lg p-4 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">{user.name}</h3>
              <p><strong>Phone:</strong> {user.phone}</p>
              <p><strong>Pincode:</strong> {user.pincode}</p>
              <p><strong>Location:</strong> {user.latitude}, {user.longitude}</p>
              <p><strong>Joined:</strong> {new Date(user.timestamp).toLocaleString()}</p>
              {/* Future: Add delete/edit buttons here */}
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex justify-center mt-4 space-x-2">
          {Array.from({ length: Math.ceil(filteredUsers.length / ITEMS_PER_PAGE) }).map((_, i) => (
            <button
              key={i}
              onClick={() => setUserPage(i + 1)}
              className={`px-3 py-1 rounded ${userPage === i + 1 ? "bg-blue-600 text-white" : "bg-white border"}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </section>

      {/* AUTHORITIES SECTION */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold text-gray-700"> Authorities</h2>
          <button
            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
            onClick={() => exportCSV(filteredAuthorities, "authorities.csv")}
          >
            Export CSV
          </button>
        </div>
        <input
          type="text"
          placeholder="Search authorities by name or phone"
          className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded mb-4"
          value={searchAuthority}
          onChange={(e) => {
            setSearchAuthority(e.target.value);
            setAuthPage(1);
          }}
        />

        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {paginatedAuthorities.map((auth, index) => (
            <div key={index} className="bg-white shadow rounded-lg p-4 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">{auth.name}</h3>
              <p><strong>Phone:</strong> {auth.phone}</p>
              <p><strong>Email:</strong> {auth.email}</p>
              <p><strong>District:</strong> {auth.district}</p>
              <p><strong>Role:</strong> {auth.role}</p>
              <p><strong>Registered:</strong> {new Date(auth.created_at).toLocaleString()}</p>
              {/* Future: Add delete/edit buttons here */}
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex justify-center mt-4 space-x-2">
          {Array.from({ length: Math.ceil(filteredAuthorities.length / ITEMS_PER_PAGE) }).map((_, i) => (
            <button
              key={i}
              onClick={() => setAuthPage(i + 1)}
              className={`px-3 py-1 rounded ${authPage === i + 1 ? "bg-blue-600 text-white" : "bg-white border"}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default UsersAndAuthorities;
