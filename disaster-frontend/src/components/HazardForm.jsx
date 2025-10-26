import React, { useState } from 'react';
import axios from 'axios';

function HazardForm() {
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/report', {
        description,
        location,
        timestamp: new Date().toISOString()
      });
      alert('Hazard reported successfully!');
      setDescription('');
      setLocation('');
    } catch (err) {
      alert('Error reporting hazard.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow max-w-md mx-auto mt-6">
      <h2 className="text-xl font-bold mb-4">Report Hazard</h2>
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        className="w-full border p-2 mb-4"
        required
      />
      <input
        type="text"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Location"
        className="w-full border p-2 mb-4"
        required
      />
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
        Submit
      </button>
    </form>
  );
}

export default HazardForm;
