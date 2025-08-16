import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const EditAuditorium = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    capacity: '',
    location: '',
    description: '',
    amenities: '',
    available: true,
    contactInfo: '',
    size: '',
  });
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAuditorium = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('authToken');
        const res = await fetch(`/api/auditoriums/${id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to fetch auditorium');
        setForm({
          ...data.data,
          amenities: Array.isArray(data.data.amenities) ? data.data.amenities.join(', ') : data.data.amenities,
        });
        setImagePreviews(data.data.images || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAuditorium();
  }, [id]);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = e => {
    const files = Array.from(e.target.files);
    setImageFiles(files);
    setImagePreviews(files.map(file => URL.createObjectURL(file)));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!form || typeof form !== 'object') {
        setError('Form data is missing or invalid.');
        setLoading(false);
        return;
      }
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value);
      });
      formData.append('amenities', form.amenities.split(',').map(a => a.trim()));
      imageFiles.forEach(file => formData.append('image', file));
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/auditoriums/${id}`, {
        method: 'PUT',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update auditorium');
      toast.success('Auditorium updated successfully!');
      setTimeout(() => navigate('/admin/manage-auditoriums'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f7f7] px-4 py-10">
      <ToastContainer position="top-center" autoClose={1500} />
      <div className="max-w-xl w-full backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-2xl p-8 relative">
        <h2 className="text-4xl font-extrabold mb-8 text-[#82181A] text-center drop-shadow-lg tracking-tight">Edit Auditorium</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block font-semibold text-[#82181A] drop-shadow">Name</label>
            <input name="name" value={form.name} onChange={handleChange} required placeholder="Name" className="w-full px-4 py-2 rounded-xl bg-white/60 border border-[#82181A]/30 focus:outline-none focus:ring-2 focus:ring-[#82181A]/40 shadow-sm" />
          </div>
          <div className="space-y-2">
            <label className="block font-semibold text-[#82181A] drop-shadow">Capacity</label>
            <input name="capacity" value={form.capacity} onChange={handleChange} required placeholder="Capacity" type="number" className="w-full px-4 py-2 rounded-xl bg-white/60 border border-[#82181A]/30 focus:outline-none focus:ring-2 focus:ring-[#82181A]/40 shadow-sm" />
          </div>
          <div className="space-y-2">
            <label className="block font-semibold text-[#82181A] drop-shadow">Location</label>
            <input name="location" value={form.location} onChange={handleChange} required placeholder="Location" className="w-full px-4 py-2 rounded-xl bg-white/60 border border-[#82181A]/30 focus:outline-none focus:ring-2 focus:ring-[#82181A]/40 shadow-sm" />
          </div>
          <div className="space-y-2">
            <label className="block font-semibold text-[#82181A] drop-shadow">Contact Info</label>
            <input name="contactInfo" value={form.contactInfo} onChange={handleChange} placeholder="Contact Info" className="w-full px-4 py-2 rounded-xl bg-white/60 border border-[#82181A]/30 focus:outline-none focus:ring-2 focus:ring-[#82181A]/40 shadow-sm" />
          </div>
          <div className="space-y-2">
            <label className="block font-semibold text-[#82181A] drop-shadow">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} required placeholder="Description" className="w-full px-4 py-2 rounded-xl bg-white/60 border border-[#82181A]/30 focus:outline-none focus:ring-2 focus:ring-[#82181A]/40 shadow-sm resize-none" />
          </div>
          <div className="space-y-2">
            <label className="block font-semibold text-[#82181A] drop-shadow">Amenities</label>
            <input name="amenities" value={form.amenities} onChange={handleChange} placeholder="Amenities (comma separated)" className="w-full px-4 py-2 rounded-xl bg-white/60 border border-[#82181A]/30 focus:outline-none focus:ring-2 focus:ring-[#82181A]/40 shadow-sm" />
          </div>
          <div className="space-y-2">
            <label className="block font-semibold text-[#82181A] drop-shadow">Image Upload (will replace existing images)</label>
            <input type="file" accept="image/*" multiple onChange={handleImageChange} className="w-full px-4 py-2 rounded-xl bg-white/60 border border-[#82181A]/30 focus:outline-none focus:ring-2 focus:ring-[#82181A]/40 shadow-sm" />
            <div className="mt-2 flex flex-wrap gap-2 items-center justify-center">
              {imagePreviews.length > 0 ? imagePreviews.map((img, idx) => (
                <img key={idx} src={img} alt="Preview" className="h-24 w-24 object-cover rounded-xl shadow-lg border border-[#82181A]/30" />
              )) : <div className="h-24 w-24 flex items-center justify-center bg-white/40 text-[#82181A]/40 rounded-xl border border-[#82181A]/20 shadow">No image</div>}
            </div>
          </div>
          <label className="flex items-center font-semibold text-[#82181A] drop-shadow"><input type="checkbox" name="available" checked={form.available} onChange={handleChange} className="mr-2 accent-[#82181A]" />Available</label>
          <button type="submit" disabled={loading} className="w-full py-2 rounded-xl bg-gradient-to-r from-[#82181A] via-[#c72c2c] to-[#82181A] text-white font-bold shadow-lg hover:scale-[1.03] transition-transform duration-150">{loading ? 'Updating...' : 'Update Auditorium'}</button>
          {error && <div className="text-red-600 mt-2 text-center font-semibold drop-shadow">{error}</div>}
        </form>
      </div>
    </div>
  );
};

export default EditAuditorium;
