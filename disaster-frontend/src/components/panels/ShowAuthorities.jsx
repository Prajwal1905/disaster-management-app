import React, { useEffect, useState } from 'react';
import axios from 'axios';

const ShowAuthorities = () => {
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortKey, setSortKey] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');

  const fetchAuthorities = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/authorities', {
        params: {
          page: currentPage,
          limit: 5,
          search: searchTerm
        }
      });
      setData(res.data.data);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error('Error fetching authorities:', err);
    }
  };

  useEffect(() => {
    fetchAuthorities();
  }, [searchTerm, currentPage]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const sorted = [...data].sort((a, b) => {
    if (!sortKey) return 0;
    const valA = a[sortKey]?.toString().toLowerCase();
    const valB = b[sortKey]?.toString().toLowerCase();
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Registered Authorities</h2>

      <input
        type="text"
        placeholder="Search by name or email..."
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setCurrentPage(1);
        }}
        className="mb-4 p-2 border rounded w-full"
      />

      <table className="min-w-full bg-white border rounded shadow">
        <thead>
          <tr>
            <th className="p-3 cursor-pointer" onClick={() => handleSort('name')}>Name ⬍</th>
            <th className="p-3 cursor-pointer" onClick={() => handleSort('email')}>Email ⬍</th>
            <th className="p-3 cursor-pointer" onClick={() => handleSort('role')}>Role ⬍</th>
            <th className="p-3">Location</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan="5" className="text-center p-4">No authorities found.</td>
            </tr>
          ) : (
            sorted.map((auth) => (
              <tr key={auth._id} className="border-t">
                <td className="p-3">{auth.name}</td>
                <td className="p-3">{auth.email}</td>
                <td className="p-3">{auth.role}</td>
                <td className="p-3">
                  {auth.location ? (
                    <a
                      href={`https://www.google.com/maps?q=${encodeURIComponent(auth.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600"
                    >
                      📍
                    </a>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="p-3">
                  <button
                    className="bg-yellow-500 text-white px-2 py-1 rounded"
                    onClick={() => console.log('Edit authority:', auth)}
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination Controls */}
      <div className="mt-4 flex justify-between items-center">
        <button
          className="bg-gray-300 px-4 py-1 rounded disabled:opacity-50"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((p) => p - 1)}
        >
          Prev
        </button>
        <span>Page {currentPage} of {totalPages}</span>
        <button
          className="bg-gray-300 px-4 py-1 rounded disabled:opacity-50"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default ShowAuthorities;
