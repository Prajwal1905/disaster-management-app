import React, { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const VolunteerForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "", // ✅ NEW FIELD
    age: "",
    gender: "",
    pincode: "",
    district: "",
    skills: "Volunteer",
    preferredTasks: "Volunteer",
    availability: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("/api/volunteer-join", formData);
      toast.success("Thanks for registering as a volunteer!");
      setFormData({
        name: "",
        phone: "",
        email: "",
        password: "", // ✅ Reset password too
        age: "",
        gender: "",
        pincode: "",
        district: "",
        skills: "Volunteer",
        preferredTasks: "Volunteer",
        availability: "",
      });
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to register. Please try again.");
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-8 p-4 bg-white shadow rounded">
      <h2 className="text-2xl font-bold mb-4">Volunteer Registration</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input type="text" name="name" placeholder="Full Name" required onChange={handleChange} value={formData.name} className="w-full border p-2 rounded" />
        <input type="tel" name="phone" placeholder="Phone Number" required onChange={handleChange} value={formData.phone} className="w-full border p-2 rounded" />
        <input type="email" name="email" placeholder="Email Address" required onChange={handleChange} value={formData.email} className="w-full border p-2 rounded" />
        <input type="password" name="password" placeholder="Create Password" required onChange={handleChange} value={formData.password} className="w-full border p-2 rounded" /> {/* ✅ NEW FIELD */}
        <input type="number" name="age" placeholder="Age" onChange={handleChange} value={formData.age} className="w-full border p-2 rounded" />
        
        <select name="gender" required onChange={handleChange} value={formData.gender} className="w-full border p-2 rounded">
          <option value="">Select Gender</option>
          <option>Male</option>
          <option>Female</option>
          <option>Other</option>
        </select>

        <input type="text" name="pincode" placeholder="Pincode" required onChange={handleChange} value={formData.pincode} className="w-full border p-2 rounded" />
        <input type="text" name="district" placeholder="District" required onChange={handleChange} value={formData.district} className="w-full border p-2 rounded" />

        <select name="skills" onChange={handleChange} value={formData.skills} className="w-full border p-2 rounded">
          <option value="Volunteer">Volunteer (Default)</option>
          <option value="Medical">Medical</option>
          <option value="Logistics">Logistics</option>
          <option value="Rescue">Rescue</option>
          <option value="Counseling">Counseling</option>
        </select>

        <select name="preferredTasks" onChange={handleChange} value={formData.preferredTasks} className="w-full border p-2 rounded">
          <option value="Volunteer">Volunteer (Default)</option>
          <option value="Food Distribution">Food Distribution</option>
          <option value="Shelter Support">Shelter Support</option>
          <option value="Medical Aid">Medical Aid</option>
          <option value="Crowd Management">Crowd Management</option>
        </select>

        <select name="availability" onChange={handleChange} value={formData.availability} className="w-full border p-2 rounded">
          <option value="">Select Availability</option>
          <option value="Weekdays">Weekdays</option>
          <option value="Weekends">Weekends</option>
          <option value="Anytime">Anytime</option>
          <option value="Specific Hours">Specific Hours</option>
        </select>

        <button type="submit" className="bg-teal-600 text-white px-4 py-2 rounded hover:bg-teal-700">
          Register
        </button>
      </form>
    </div>
  );
};

export default VolunteerForm;
