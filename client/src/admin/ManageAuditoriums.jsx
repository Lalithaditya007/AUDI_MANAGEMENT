import React, { useEffect, useState } from 'react';
import AuditoriumPreviewModal from './AuditoriumPreviewModal';
import { useNavigate } from 'react-router-dom';
import { FaTrash, FaEdit, FaPlus } from 'react-icons/fa';

const ManageAuditoriums = () => {
  const [auditoriums, setAuditoriums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previewAuditorium, setPreviewAuditorium] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAuditoriums = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const res = await fetch('/api/auditoriums', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to fetch auditoriums');
        setAuditoriums(data.data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAuditoriums();
  }, []);

  const handleDelete = async (id) => {
    setPreviewAuditorium(null); // Close modal if open
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/auditoriums/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to delete auditorium');
      setAuditoriums(auditoriums.filter(a => a._id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (id) => {
    navigate(`/admin/auditoriums/${id}`);
  };

  const handlePreview = (aud) => {
    setPreviewAuditorium(aud);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex justify-between items-center mb-6">
  <h1 className="text-3xl font-bold text-[#82181A] mt-20">Manage Auditoriums</h1>
        <button onClick={() => navigate('/admin/add-auditorium')} className="flex items-center gap-2 px-4 py-2 bg-[#82181A] text-white rounded-lg shadow hover:bg-[#a32c2c] transition">
          <FaPlus /> Add Auditorium
        </button>
      </div>
      {loading ? (
        <div>Loading auditoriums...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {auditoriums.map(aud => (
            <div key={aud._id} className="bg-white rounded-lg shadow p-0 flex flex-col gap-2 relative group border border-gray-200 hover:shadow-lg transition cursor-pointer" onClick={() => handlePreview(aud)}>
              {aud.images && aud.images.length > 0 ? (
                <img
                  src={aud.images[0]?.startsWith('http') ? aud.images[0] : `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${aud.images[0]}`}
                  alt={aud.name}
                  className="w-full h-40 object-cover rounded-t-lg"
                />
              ) : (
                <div className="w-full h-40 bg-gray-200 flex items-center justify-center rounded-t-lg text-gray-400">No Image</div>
              )}
              <div className="flex justify-between items-center px-4 pt-2">
                <h2 className="text-xl font-semibold text-[#82181A] hover:underline">{aud.name}</h2>
                <button onClick={e => { e.stopPropagation(); handleDelete(aud._id); }} className="text-red-600 hover:text-red-800 p-1 rounded-full transition" title="Delete"><FaTrash /></button>
              </div>
              <div className="text-gray-700 px-4">Capacity: {aud.capacity}</div>
              <div className="text-gray-700 px-4 pb-2">Location: {aud.location}</div>
              <div className="flex gap-2 mt-2 px-4 pb-4">
                <button onClick={e => { e.stopPropagation(); handleEdit(aud._id); }} className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"><FaEdit /> Edit</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {previewAuditorium && (
        <AuditoriumPreviewModal auditorium={previewAuditorium} onClose={() => setPreviewAuditorium(null)} />
      )}
    </div>
  );
};

export default ManageAuditoriums;
