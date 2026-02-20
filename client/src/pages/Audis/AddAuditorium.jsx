import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AddAuditorium = () => {
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
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleChange = e => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = e => {
    const file = e.target.files[0];
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview('');
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      // Determine size based on capacity
      let size = '';
      const cap = Number(form.capacity);
      if (cap < 200) size = 'small';
      else if (cap < 400) size = 'medium';
      else size = 'large';

      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        formData.append(key, value);
      });
      formData.append('size', size);
      formData.append('amenities', form.amenities.split(',').map(a => a.trim()));
      if (imageFile) {
        formData.append('image', imageFile);
      }
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/auditoriums', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to add auditorium');
      setSuccess(true);
      setForm({
        name: '', capacity: '', location: '', description: '', amenities: '', available: true, contactInfo: '', size: '',
      });
      setImageFile(null);
      setImagePreview('');
      // Show notification and redirect to admin dashboard
      toast.success('Auditorium created successfully!');
      setTimeout(() => {
        navigate('/admin-dashboard');
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f7f7] px-4 py-10">
      <ToastContainer position="top-center" autoClose={1500} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
      <div className="max-w-xl w-full backdrop-blur-lg bg-white/30 border border-white/40 rounded-2xl shadow-2xl p-8 relative">
        <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{boxShadow: '0 8px 32px 0 rgba(130,24,26,0.15)', border: '1px solid rgba(255,255,255,0.18)'}}></div>
        <h2 className="text-4xl font-extrabold mb-8 text-[#82181A] text-center drop-shadow-lg tracking-tight">Add New Auditorium</h2>
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
          {/* Size is set automatically based on capacity */}
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
            <label className="block font-semibold text-[#82181A] drop-shadow">Image Upload</label>
            <input type="file" accept="image/*" onChange={handleImageChange} className="w-full px-4 py-2 rounded-xl bg-white/60 border border-[#82181A]/30 focus:outline-none focus:ring-2 focus:ring-[#82181A]/40 shadow-sm" />
            <div className="mt-2 flex items-center justify-center">
              {imagePreview ? (
                <img src={imagePreview.startsWith('http') ? imagePreview : `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${imagePreview}`} alt="Preview" className="h-32 w-32 object-cover rounded-xl shadow-lg border border-[#82181A]/30" />
              ) : (
                <div className="h-32 w-32 flex items-center justify-center bg-white/40 text-[#82181A]/40 rounded-xl border border-[#82181A]/20 shadow">Image preview</div>
              )}
            </div>
          </div>
          <label className="flex items-center font-semibold text-[#82181A] drop-shadow"><input type="checkbox" name="available" checked={form.available} onChange={handleChange} className="mr-2 accent-[#82181A]" />Available</label>
          <button type="submit" disabled={loading} className="w-full py-2 rounded-xl bg-gradient-to-r from-[#82181A] via-[#c72c2c] to-[#82181A] text-white font-bold shadow-lg hover:scale-[1.03] transition-transform duration-150">{loading ? 'Adding...' : 'Add Auditorium'}</button>
          {error && <div className="text-red-600 mt-2 text-center font-semibold drop-shadow">{error}</div>}
          {success && <div className="text-green-600 mt-2 text-center font-semibold drop-shadow">Auditorium added successfully!</div>}
        </form>
      </div>
    </div>
  );
};

export default AddAuditorium;
