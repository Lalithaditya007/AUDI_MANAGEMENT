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
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
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
    const files = Array.from(e.target.files);
    
    if (files.length === 0) return;
    
    // Check if adding these files would exceed the limit
    if (imageFiles.length + files.length > 5) {
      alert(`You can only upload a maximum of 5 images. You currently have ${imageFiles.length} image(s). You can add ${5 - imageFiles.length} more.`);
      e.target.value = '';
      return;
    }
    
    // Validate each file
    const validFiles = [];
    
    for (let file of files) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        alert(`File "${file.name}" is not a valid image file (JPEG, PNG, or GIF)`);
        continue;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert(`File "${file.name}" is too large. Maximum size is 5MB`);
        continue;
      }
      
      validFiles.push(file);
      
      // Create preview for this file
      const reader = new FileReader();
      reader.onloadend = () => {
        console.log(`Image preview created for: ${file.name}`);
        setImagePreviews(prevPreviews => [...prevPreviews, reader.result]);
      };
      reader.onerror = () => {
        console.error(`Error reading file: ${file.name}`);
        alert(`Error reading file: ${file.name}`);
      };
      reader.readAsDataURL(file);
    }
    
    // Add new files to existing files
    setImageFiles(prevFiles => [...prevFiles, ...validFiles]);
    
    // Clear the input value so the same file can be selected again if needed
    e.target.value = '';
  };

  const removeImage = (indexToRemove) => {
    console.log(`Removing image at index ${indexToRemove}`);
    
    // Clean up object URL for the removed image
    if (imagePreviews[indexToRemove] && imagePreviews[indexToRemove].startsWith('blob:')) {
      URL.revokeObjectURL(imagePreviews[indexToRemove]);
    }
    
    setImageFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
    setImagePreviews(prevPreviews => prevPreviews.filter((_, index) => index !== indexToRemove));
  };

  // Function to clear all images
  const clearAllImages = () => {
    console.log('Clearing all images');
    
    // Clean up all object URLs
    imagePreviews.forEach(preview => {
      if (preview && preview.startsWith('blob:')) {
        URL.revokeObjectURL(preview);
      }
    });
    
    setImageFiles([]);
    setImagePreviews([]);
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
      
      // Append multiple images
      if (imageFiles.length > 0) {
        imageFiles.forEach((file, index) => {
          formData.append('images', file);
        });
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
      setImageFiles([]);
      setImagePreviews([]);
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
            
            {/* Initial file input or Add More button */}
            {imageFiles.length === 0 ? (
              <div>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  onChange={handleImageChange} 
                  className="w-full px-4 py-2 rounded-xl bg-white/60 border border-[#82181A]/30 focus:outline-none focus:ring-2 focus:ring-[#82181A]/40 shadow-sm" 
                />
                <p className="text-xs text-[#82181A]/60 mt-1">Select up to 5 images (Max 5MB each, JPEG/PNG/GIF)</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#82181A]/80">{imageFiles.length} of 5 images selected</p>
                  {imageFiles.length < 5 && (
                    <div className="relative">
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple 
                        onChange={handleImageChange} 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        id="add-more-images"
                      />
                      <label 
                        htmlFor="add-more-images"
                        className="inline-flex items-center px-3 py-1.5 bg-[#82181A] text-white text-sm rounded-lg hover:bg-[#82181A]/90 cursor-pointer transition-colors"
                      >
                        <span className="mr-1">+</span>
                        Add More
                      </label>
                    </div>
                  )}
                </div>
                {imageFiles.length >= 5 && (
                  <p className="text-xs text-orange-600">Maximum 5 images reached</p>
                )}
              </div>
            )}
            <div className="mt-3">
              {imagePreviews.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-[#82181A]">Image Previews</h4>
                    <button
                      type="button"
                      onClick={clearAllImages}
                      className="text-xs text-red-600 hover:text-red-800 underline"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img 
                          src={preview} 
                          alt={`Preview ${index + 1}`} 
                          className="h-20 w-20 object-cover rounded-lg shadow-md border border-[#82181A]/20 transition-transform group-hover:scale-105"
                          onLoad={() => console.log(`Preview image ${index + 1} loaded successfully`)}
                          onError={(e) => {
                            console.error(`Error loading preview image ${index + 1}:`, e);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors shadow-md"
                          title="Remove image"
                        >
                          ×
                        </button>
                        <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
                          {index + 1}
                        </div>
                      </div>
                    ))}
                    
                    {/* Add more placeholder if less than 5 images */}
                    {imageFiles.length < 5 && (
                      <div className="h-20 w-20 border-2 border-dashed border-[#82181A]/30 rounded-lg flex items-center justify-center relative group cursor-pointer hover:border-[#82181A]/50 transition-colors">
                        <input 
                          type="file" 
                          accept="image/*" 
                          multiple 
                          onChange={handleImageChange} 
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="text-[#82181A]/40 group-hover:text-[#82181A]/60 transition-colors">
                          <span className="text-2xl">+</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-20 w-20 flex items-center justify-center bg-white/40 text-[#82181A]/40 rounded-xl border border-[#82181A]/20 shadow">
                  {imageFiles.length > 0 ? 'Loading...' : 'No images'}
                </div>
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
