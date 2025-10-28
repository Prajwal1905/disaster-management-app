import React, { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import Webcam from "react-webcam";
import { API_BASE_URL } from "../config";


const videoConstraints = {
  width: 300,
  facingMode: "user",
};

const AuthorityLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [faceImage, setFaceImage] = useState("");
  const webcamRef = useRef(null);
  const navigate = useNavigate();

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setFaceImage(imageSrc);
    toast.success("Face captured!");
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Email and password required");
      return;
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/api/authority-login`, {
        email,
        password,
        faceImage: faceImage || null,
      });


      const { token, message, authority } = res.data;

      toast.success(message || "Login successful");

      localStorage.setItem("authToken", token);
      localStorage.setItem("authEmail", email);
      localStorage.setItem("authorityUser", JSON.stringify(authority));

      navigate("/authority/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.error || "Login failed");
    }
  };
  
  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white shadow rounded">
      <h2 className="text-2xl font-bold text-center mb-4">Authority Login</h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          className="w-full px-4 py-2 border rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full px-4 py-2 border rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="text-center">
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/png"
            videoConstraints={videoConstraints}
            className="rounded border mx-auto"
          />
          <button
            type="button"
            onClick={capture}
            className="mt-2 px-4 py-1 bg-green-600 text-white rounded"
          >
            Capture Face
          </button>
        </div>

        {faceImage && (
          <img
            src={faceImage}
            alt="Face Preview"
            className="h-24 w-24 object-cover rounded-full mx-auto mt-2"
          />
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Login
        </button>
      </form>
    </div>
  );
};

export default AuthorityLogin;
