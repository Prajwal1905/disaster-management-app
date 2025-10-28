import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { API_BASE_URL } from "../config";


const SuperadminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post(`${API_BASE_URL}/api/superadmin/login`, {
        username,
        password,
      });

      // ✅ Save token in localStorage
      localStorage.setItem("token", response.data.token);

      toast.success("Login successful!");
      navigate('/superadmin/dashboard');
    } catch (err) {
      toast.error("Login failed! Invalid credentials");
      console.error(err);
    }
  };

  return (
    <div className="text-center p-4">
      <h2 className="text-2xl font-semibold mb-4">Superadmin Login</h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="px-4 py-2 border rounded w-full"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="px-4 py-2 border rounded w-full"
        />
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">
          Login
        </button>
      </form>
    </div>
  );
};

export default SuperadminLogin;
