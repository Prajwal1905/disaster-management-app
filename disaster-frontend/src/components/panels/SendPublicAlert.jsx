import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { API_BASE_URL } from "../../config";


const SendPublicAlert = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('');
  const [district, setDistrict] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !message || !type || !district) {
      toast.error('Please fill in all fields.');
      return;
    }

    try {
      const res = await axios.post(`${API_BASE_URL}/api/superadmin/send-alert`, {
        title,
        message,
        type,
        district,
      });

      if (res.status === 201) {
        toast.success('Public alert sent successfully!');
        setTitle('');
        setMessage('');
        setType('');
        setDistrict('');
      } else {
        toast.error('Failed to send alert.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error sending public alert.');
    }
  };

  return (
    
    <div className="max-w-xl mx-auto bg-white p-6 rounded-lg shadow">
        
      <h2 className="text-2xl font-bold mb-4">Send Public Alert</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Alert Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full mb-3 px-4 py-2 border rounded"
        />
        <textarea
          placeholder="Alert Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="w-full mb-3 px-4 py-2 border rounded"
        ></textarea>
        <input
          type="text"
          placeholder="Type (e.g., Flood, Fire)"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="w-full mb-3 px-4 py-2 border rounded"
        />
        <input
          type="text"
          placeholder="District"
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className="w-full mb-3 px-4 py-2 border rounded"
        />
        <button
          type="submit"
          className="bg-red-600 text-white px-6 py-2 rounded hover:bg-red-700"
        >
          Send Alert
        </button>
      </form>
    </div>
  );
};

export default SendPublicAlert;
