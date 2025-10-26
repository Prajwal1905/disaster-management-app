import React, { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const SuperadminAuthorities = () => {
  const [authorities, setAuthorities] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [editingId, setEditingId] = useState(null);

  const fetchAuthorities = async () => {
    try {
      const res = await axios.get("/api/superadmin/authorities");
      setAuthorities(res.data);
    } catch (err) {
      toast.error("Failed to load authorities.");
    }
  };

  useEffect(() => {
    fetchAuthorities();
  }, []);

  const handleInput = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await axios.put(`/api/superadmin/authorities/${editingId}`, form);
        toast.success("Authority updated.");
      } else {
        await axios.post("/api/superadmin/authorities", form);
        toast.success("Authority added.");
      }
      setForm({ name: "", email: "", password: "" });
      setEditingId(null);
      fetchAuthorities();
    } catch (err) {
      toast.error("Failed to save authority.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this authority?")) return;
    try {
      await axios.delete(`/api/superadmin/authorities/${id}`);
      toast.success("Authority deleted.");
      fetchAuthorities();
    } catch (err) {
      toast.error("Failed to delete.");
    }
  };

  const startEdit = (auth) => {
    setForm({ name: auth.name, email: auth.email, password: "" });
    setEditingId(auth._id);
  };

  return (
    <div className="p-6">
      <h2 className="text-3xl font-bold mb-4">Manage Authorities</h2>

      <div className="bg-white shadow p-4 rounded mb-6">
        <h3 className="text-xl font-semibold mb-2">{editingId ? "Edit Authority" : "Add New Authority"}</h3>
        <input
          type="text"
          name="name"
          placeholder="Name"
          value={form.name}
          onChange={handleInput}
          className="border p-2 rounded w-full mb-2"
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleInput}
          className="border p-2 rounded w-full mb-2"
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={form.password}
          onChange={handleInput}
          className="border p-2 rounded w-full mb-2"
        />
        <button onClick={handleSubmit} className="bg-blue-600 text-white px-4 py-2 rounded">
          {editingId ? "Update" : "Add"}
        </button>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-2">Authority List</h3>
        {authorities.map((auth) => (
          <div key={auth._id} className="flex justify-between items-center bg-gray-100 p-3 mb-2 rounded">
            <div>
              <p className="font-medium">{auth.name}</p>
              <p className="text-sm text-gray-600">{auth.email}</p>
            </div>
            <div>
              <button
                onClick={() => startEdit(auth)}
                className="text-blue-500 hover:underline mr-4"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(auth._id)}
                className="text-red-500 hover:underline"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SuperadminAuthorities;
