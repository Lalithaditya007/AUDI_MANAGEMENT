
import React, { useEffect, useState } from 'react';
import { FaTrash } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';

const DEFAULT_PROFILE = '/vite.svg'; // fallback image
import { buildUploadImage } from '../utils/imagePath';

const SERVER_BASE_URL = (import.meta.env.VITE_API_URL || import.meta.env.VITE_SERVER_URL || '').replace(/\/$/, '');

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
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

  useEffect(() => { fetchUsers(); }, []);

  const handleDelete = async (id) => {
    const target = users.find(u => u._id === id);
    if (!window.confirm(`Delete user ${target?.name || target?.email || ''}? This cannot be undone.`)) return;
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to delete user');
      setUsers(prev => prev.filter(u => u._id !== id));
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 py-14 px-4 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-700 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">Manage Users</h1>
            <p className="text-sm text-slate-500 mt-2">View, search and remove user accounts.</p>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <input
                type="text"
                placeholder="Search users..."
                className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white/70 backdrop-blur border border-slate-200 focus:ring-2 focus:ring-indigo-400 focus:outline-none text-sm shadow-sm"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M11 19a8 8 0 100-16 8 8 0 000 16zm8-2l-4.35-4.35" /></svg>
              {search && (
                <button onClick={()=>setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
            <button
              onClick={() => navigate('/admin/create-user')}
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-sm px-5 py-2.5 rounded-xl shadow-sm transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              New User
            </button>
          </div>
        </div>

        {/* Card Container */}
        <div className="bg-white/70 backdrop-blur rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Table / States */}
          {loading ? (
            <div className="p-8">
              <div className="space-y-3 mb-6 animate-pulse">
                <div className="h-4 w-1/5 bg-slate-200 rounded" />
              </div>
              <ul className="space-y-4">
                {Array.from({length:6}).map((_,i)=>(
                  <li key={i} className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-3 md:col-span-2 flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full bg-slate-200" />
                      <div className="space-y-2 flex-1">
                        <div className="h-3 bg-slate-200 rounded w-24" />
                        <div className="h-3 bg-slate-100 rounded w-32" />
                      </div>
                    </div>
                    <div className="hidden md:block col-span-3 h-3 bg-slate-100 rounded" />
                    <div className="hidden md:block col-span-2 h-3 bg-slate-100 rounded" />
                    <div className="col-span-2 md:col-span-2 h-8 bg-slate-100 rounded" />
                    <div className="col-span-2 md:col-span-1 flex justify-end"><div className="w-8 h-8 bg-slate-200 rounded-full" /></div>
                  </li>
                ))}
              </ul>
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <p className="text-rose-600 font-semibold mb-4">{error}</p>
              <button onClick={fetchUsers} className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium shadow hover:bg-indigo-500">Retry</button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-16 text-center">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center mb-6 text-indigo-500">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h9.75A2.25 2.25 0 0019.5 18.75V12M9 9h6m-6 3h3" /></svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">No users found</h3>
              <p className="text-slate-500 text-sm mb-6">Try adjusting your search or create a new user.</p>
              <button onClick={()=>navigate('/admin/create-user')} className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium shadow hover:bg-indigo-500">Create User</button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 bg-slate-50 border-b border-slate-200">
                    <th className="py-3 px-4 font-semibold">User</th>
                    <th className="py-3 px-4 font-semibold hidden md:table-cell">Email</th>
                    <th className="py-3 px-4 font-semibold hidden md:table-cell">Role</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map(user => {
                    const displayName = user.name || user.username || user.profile?.fullName || user.email;
                    const first = (displayName || '?').charAt(0).toUpperCase();
                    const roleColor = user.role === 'admin' ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white' : 'bg-indigo-100 text-indigo-700';
                    const rawPhoto = user.profilePhoto || user.profile?.photo;
                    const photoSrc = rawPhoto ? buildUploadImage(rawPhoto) : null;
                    return (
                      <tr key={user._id} className="hover:bg-indigo-50/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3 min-w-[180px]">
                            {photoSrc ? (
                              <img src={photoSrc} alt={displayName} className="w-11 h-11 rounded-full object-cover ring-2 ring-white shadow-sm bg-slate-100" onError={e=>{e.currentTarget.style.display='none';}} />
                            ) : (
                              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-sm font-semibold shadow-sm select-none">{first}</div>
                            )}
                            <div className="leading-tight">
                              <p className="font-semibold text-slate-800 line-clamp-1">{displayName}</p>
                              <p className="text-xs text-slate-500 hidden md:block">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell text-slate-600">{user.email}</td>
                        <td className="py-3 px-4 hidden md:table-cell">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${roleColor}`}>
                            {user.role.charAt(0).toUpperCase()+user.role.slice(1)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDelete(user._id)}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-full text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 hover:bg-rose-600 transition shadow-sm"
                            title="Delete user"
                          >
                            <FaTrash size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <p className="text-[10px] text-slate-400 mt-4 text-center">Showing {filteredUsers.length} of {users.length} users</p>
      </div>
    </div>
  );
};

export default ManageUsers;
