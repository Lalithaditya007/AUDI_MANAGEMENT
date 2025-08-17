
import React, { useEffect, useState } from 'react';
import { FaTrash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const DEFAULT_PROFILE = '/vite.svg'; // fallback image
const SERVER_BASE_URL = import.meta.env.VITE_SERVER_URL || '';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const res = await fetch('/api/users', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to fetch users');
        setUsers(data.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to delete user');
      setUsers(users.filter(u => u._id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  // Filter users by search
  const filteredUsers = users.filter(
    (user) =>
      (user.name || user.username || user.profile?.fullName || "").toLowerCase().includes(search.toLowerCase()) ||
      (user.email || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-300 py-10 px-2 flex flex-col items-center">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl p-8 mt-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <h1 className="text-4xl font-extrabold text-[#82181A] mb-4 md:mb-0 tracking-tight drop-shadow">Manage Users</h1>
          <button
            onClick={() => navigate('/admin/create-user')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow transition-all duration-200"
          >
            + Create New User
          </button>
        </div>
        <div className="mb-6 flex flex-col sm:flex-row sm:justify-end gap-3">
          <input
            type="text"
            placeholder="Search by name or email..."
            className="border border-gray-300 rounded-lg px-4 py-2 w-full sm:w-80 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {loading ? (
          <div className="text-center text-lg text-gray-600 py-10">Loading users...</div>
        ) : error ? (
          <div className="text-center text-red-600 font-semibold py-10">{error}</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
            <table className="min-w-full bg-white rounded-xl">
              <thead className="bg-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider rounded-tl-xl">Photo</th>
                  <th className="py-3 px-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Name</th>
                  <th className="py-3 px-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Email</th>
                  <th className="py-3 px-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Role</th>
                  <th className="py-3 px-4 text-center text-xs font-bold text-gray-600 uppercase tracking-wider rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-400 text-lg">No users found.</td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user._id} className="hover:bg-blue-50 transition">
                      <td className="py-3 px-4">
                        {user.profilePhoto || user.profile?.photo ? (
                          <img
                            src={
                              user.profilePhoto
                                ? `${SERVER_BASE_URL}/uploads/${user.profilePhoto}`
                                : `${SERVER_BASE_URL}/uploads/${user.profile.photo}`
                            }
                            alt="Profile"
                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 shadow-sm bg-gray-50"
                            onError={e => { e.target.onerror = null; e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-blue-200 text-blue-800 font-bold text-xl border-2 border-gray-200 shadow-sm select-none">
                            {((user.name || user.username || user.profile?.fullName || user.email || "?").charAt(0)).toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-800">{user.name || user.username || user.profile?.fullName || user.email}</td>
                      <td className="py-3 px-4 text-gray-700">{user.email}</td>
                      <td className="py-3 px-4 text-gray-700 capitalize">{user.role}</td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleDelete(user._id)}
                          className="text-red-600 hover:text-white hover:bg-red-600 border border-red-200 hover:border-red-600 p-2 rounded-full transition duration-200 shadow-sm"
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageUsers;
