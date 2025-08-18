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
  <div className="min-h-screen bg-gray-50 p-6 pt-32">
  <div className="sticky top-24 z-40 bg-gray-50 pt-2 pb-4 flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4 md:gap-0 border-b border-gray-200">
        <h1 className="text-3xl font-bold text-[#82181A]">Manage Auditoriums</h1>
        <div className="w-full md:w-auto flex justify-end">
          <button
            onClick={() => navigate('/admin/add-auditorium')}
            className="flex items-center gap-2 px-4 py-2 bg-[#82181A] text-white rounded-lg shadow hover:bg-[#a32c2c] transition"
          >
            <FaPlus /> Add Auditorium
          </button>
        </div>
      </div>
      {loading ? (
        <div>Loading auditoriums...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {auditoriums.map(aud => (
            <div
              key={aud._id}
              className="bg-white rounded-2xl shadow-md p-0 flex flex-col gap-1.5 relative group border-2 border-gray-100 hover:border-[#82181A] hover:shadow-2xl transition-all duration-200 cursor-pointer overflow-hidden hover:scale-[1.025]"
              style={{ minHeight: '260px' }}
              onClick={() => handlePreview(aud)}
            >
              {aud.images && aud.images.length > 0 ? (
                <div className="relative w-full h-40">
                  <img
                    src={aud.images[0].startsWith('http') ? aud.images[0] : `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${aud.images[0]}`}
                    alt={aud.name}
                    className="w-full h-40 object-cover rounded-t-lg"
                  />
                  {aud.images.length > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                      +{aud.images.length - 1} more
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center rounded-t-lg text-gray-400 font-semibold text-lg">No Image</div>
              )}
              <div className="flex justify-between items-center px-4 pt-2 pb-1">
                <h2 className="text-lg font-bold text-[#82181A] group-hover:underline truncate max-w-[70%]">{aud.name}</h2>
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(aud._id); }}
                  className="text-red-500 hover:text-white hover:bg-red-500 p-1.5 rounded-full transition-colors duration-150 border border-transparent hover:border-red-700 shadow-sm"
                  title="Delete"
                >
                  <FaTrash />
                </button>
              </div>
              <div className="text-gray-600 px-4 text-sm font-medium flex items-center gap-2 mb-0.5">
                <span className="inline-block w-2 h-2 bg-[#82181A] rounded-full"></span>
                Capacity: <span className="font-semibold text-gray-800">{aud.capacity}</span>
              </div>
              <div className="text-gray-600 px-4 text-sm flex items-center gap-2 mb-1">
                <span className="inline-block w-2 h-2 bg-blue-400 rounded-full"></span>
                Location: <span className="font-semibold text-gray-800">{aud.location}</span>
              </div>
              <div className="flex gap-2 mt-auto px-4 pb-3">
                <button
                  onClick={e => { e.stopPropagation(); handleEdit(aud._id); }}
                  className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-semibold shadow transition-all duration-150"
                >
                  <FaEdit /> Edit
                </button>
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
