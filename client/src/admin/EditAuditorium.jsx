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
    amenities: [],
    available: true,
    contactInfo: '',
    size: '',
  });
  const [amenityInput, setAmenityInput] = useState('');

  // Always sync form with latest data when id changes
  useEffect(() => {
    setForm({
      name: '',
      capacity: '',
      location: '',
      description: '',
  amenities: [],
      available: true,
      contactInfo: '',
      size: '',
    });
  }, [id]);
  const [imageFiles, setImageFiles] = useState([]); // new files to upload
  const [imagePreviews, setImagePreviews] = useState([]); // preview URLs for new files
  const [existingImages, setExistingImages] = useState([]); // URLs for already uploaded images
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
          amenities: Array.isArray(data.data.amenities) ? data.data.amenities : (data.data.amenities ? String(data.data.amenities).split(',').map(a => a.trim()).filter(Boolean) : []),
        });
        setExistingImages(data.data.images || []);
        setImagePreviews([]); // clear previews for new files
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

  // Add new images to the list, keep existing images unless user removes them
  const handleImageChange = e => {
    const files = Array.from(e.target.files);
    setImageFiles(prev => [...prev, ...files]);
    setImagePreviews(prev => [...prev, ...files.map(file => URL.createObjectURL(file))]);
  };

  // Remove an existing image (already uploaded)
  const handleRemoveExistingImage = idx => {
    setExistingImages(prev => prev.filter((_, i) => i !== idx));
  };
  // Remove a new image (not yet uploaded)
  const handleRemoveNewImage = idx => {
    setImageFiles(prev => prev.filter((_, i) => i !== idx));
    setImagePreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (!form || typeof form !== 'object') {
        setError('Form data is missing or invalid.');
        setLoading(false);
        return;
      }
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key !== 'amenities') {
          formData.append(key, value);
        }
      });
      // Append amenities as repeated fields so backend receives an array
      (form.amenities || []).forEach(a => formData.append('amenities', a));
      // Add existing images (not removed)
      existingImages.forEach(img => formData.append('images', img));
      // Add new images
      imageFiles.forEach(file => formData.append('images', file));
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-2 py-8">
      <ToastContainer position="top-center" autoClose={1500} />
      <div className="max-w-3xl w-full bg-white border border-gray-200 rounded-2xl shadow-xl p-6 md:p-8 relative">
        <h2 className="text-3xl font-extrabold mb-6 text-[#82181A] text-center tracking-tight">Edit Auditorium</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div>
            <label className="block font-semibold text-[#82181A] mb-1">Name</label>
            <input name="name" value={form.name} onChange={handleChange} required placeholder="Name" className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#82181A]/40 shadow-sm" />
          </div>
          <div>
            <label className="block font-semibold text-[#82181A] mb-1">Capacity</label>
            <input name="capacity" value={form.capacity} onChange={handleChange} required placeholder="Capacity" type="number" className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#82181A]/40 shadow-sm" />
          </div>
          <div>
            <label className="block font-semibold text-[#82181A] mb-1">Location</label>
            <input name="location" value={form.location} onChange={handleChange} required placeholder="Location" className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#82181A]/40 shadow-sm" />
          </div>
          <div>
            <label className="block font-semibold text-[#82181A] mb-1">Contact Info</label>
            <input name="contactInfo" value={form.contactInfo} onChange={handleChange} placeholder="Contact Info" className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#82181A]/40 shadow-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block font-semibold text-[#82181A] mb-1">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} required placeholder="Description" className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#82181A]/40 shadow-sm resize-none min-h-24" />
          </div>
          <div className="md:col-span-2">
            <label className="block font-semibold text-[#82181A] mb-2">Amenities</label>
            <div className="w-full rounded-lg border border-gray-300 bg-white px-2 py-2 focus-within:ring-2 focus-within:ring-[#82181A]/40 shadow-sm">
              <div className="flex flex-wrap gap-2">
                {(form.amenities || []).map((tag, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#82181A]/10 text-[#82181A] text-sm font-medium">
                    {tag}
                    <button type="button" onClick={() => setForm(prev => ({ ...prev, amenities: prev.amenities.filter((_, i) => i !== idx) }))} className="ml-1 text-[#82181A] hover:text-red-600 leading-none">&times;</button>
                  </span>
                ))}
                <input
                  value={amenityInput}
                  onChange={e => setAmenityInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ',' ) {
                      e.preventDefault();
                      const raw = amenityInput.split(',').map(a => a.trim()).filter(Boolean);
                      if (raw.length === 0) return;
                      setForm(prev => ({
                        ...prev,
                        amenities: [...new Set([...(prev.amenities || []), ...raw])]
                      }));
                      setAmenityInput('');
                    } else if (e.key === 'Backspace' && amenityInput === '' && (form.amenities || []).length > 0) {
                      setForm(prev => ({ ...prev, amenities: prev.amenities.slice(0, -1) }));
                    }
                  }}
                  onBlur={() => {
                    const val = amenityInput.trim();
                    if (val) {
                      setForm(prev => ({
                        ...prev,
                        amenities: prev.amenities.includes(val) ? prev.amenities : [...prev.amenities, val]
                      }));
                      setAmenityInput('');
                    }
                  }}
                  placeholder="Type and press Enter to add"
                  className="flex-1 min-w-[180px] px-2 py-1.5 outline-none"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-1">Tip: Use Enter or comma to add. Click a tag’s × to remove.</p>
          </div>
          <div>
            <label className="block font-semibold text-[#82181A] mb-1">Add Images (existing + new)</label>
            <input type="file" accept="image/*" multiple onChange={handleImageChange} className="w-full px-3 py-2 rounded-lg bg-white border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#82181A]/40 shadow-sm" />
            <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 items-center">
              {/* Existing images from backend */}
              {existingImages.length === 0 && imagePreviews.length === 0 && (
                <div className="col-span-full h-20 w-full flex items-center justify-center bg-gray-100 text-[#82181A]/40 rounded-lg border border-gray-200 shadow font-semibold">No images</div>
              )}
              {existingImages.map((img, idx) => (
                <div key={"existing-"+idx} className="relative group">
                  <img src={img.startsWith('http') ? img : `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${img}`} alt="Existing" className="h-20 w-20 object-cover rounded-lg shadow border border-gray-200" />
                  <button type="button" onClick={() => handleRemoveExistingImage(idx)} className="absolute top-1 right-1 bg-white/80 rounded-full p-1 text-xs text-[#82181A] font-bold shadow group-hover:scale-110 transition-transform">&times;</button>
                </div>
              ))}
              {/* New images to upload */}
              {imagePreviews.map((img, idx) => (
                <div key={"new-"+idx} className="relative group">
                  <img src={img} alt="Preview" className="h-20 w-20 object-cover rounded-lg shadow border border-gray-200" />
                  <button type="button" onClick={() => handleRemoveNewImage(idx)} className="absolute top-1 right-1 bg-white/80 rounded-full p-1 text-xs text-[#82181A] font-bold shadow group-hover:scale-110 transition-transform">&times;</button>
                </div>
              ))}
            </div>
          </div>
          <div className="md:col-span-2 flex items-center justify-between">
            <label className="flex items-center font-semibold text-[#82181A]"><input type="checkbox" name="available" checked={form.available} onChange={handleChange} className="mr-2 accent-[#82181A]" />Available</label>
            <button type="submit" disabled={loading} className="px-5 py-2 rounded-lg bg-gradient-to-r from-[#82181A] via-[#c72c2c] to-[#82181A] text-white font-bold shadow hover:scale-[1.03] transition-transform duration-150">{loading ? 'Updating...' : 'Update Auditorium'}</button>
          </div>
          {error && <div className="md:col-span-2 text-red-600 mt-2 text-center font-semibold">{error}</div>}
        </form>
      </div>
    </div>
  );
};

export default EditAuditorium;
