import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// --- Helper Components ---

// Update InputField component for more compact styling
function InputField({ label, name, type = "text", value, onChange, required = true, disabled = false, min }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5 text-xs">*</span>}
      </label>
      <input
        id={name}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        min={min}
        className="w-full border border-gray-300 px-3 py-1.5 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
      />
    </div>
  );
}

function TextAreaField({
  label,
  name,
  value,
  onChange,
  required = true,
  disabled = false
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-semibold text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        rows="4"
        required={required}
        disabled={disabled}
        className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-red-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
      ></textarea>
    </div>
  );
}
// --- End Helper Components ---


// --- Debounce Utility Function ---
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
// --- End Debounce Function ---


// --- Helper: Show toast notification ---
const showToast = (type, message) => {
  // type can be 'success', 'error', 'info', 'warning'
  toast[type](message, {
    position: "top-right",
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
  });
};


// --- Main Booking Component ---

function BookAuditorium() {
  const [searchParams] = useSearchParams();

  // --- State Definitions ---
  const [formData, setFormData] = useState({
    eventName: "",
    description: "",
    startTime: "",
    endTime: "",
    auditoriumId: "",
    departmentId: "",
    eventPoster: null,
  });
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [auditoriums, setAuditoriums] = useState([]);
  const [availableAuditoriums, setAvailableAuditoriums] = useState([]);
  const [isLoadingAuditoriums, setIsLoadingAuditoriums] = useState(false);
  const [isLoadingAvailableAuditoriums, setIsLoadingAvailableAuditoriums] = useState(false);
  const [auditoriumFetchError, setAuditoriumFetchError] = useState("");
  const [departments, setDepartments] = useState([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [departmentFetchError, setDepartmentFetchError] = useState("");

  // Submission/Feedback State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // --- Helper: Show temporary feedback ---
  // removed unused showTemporaryFeedback helper

  // --- Data Fetching Callbacks ---
  const fetchAuditoriums = useCallback(async () => {
    setIsLoadingAuditoriums(true);
    setAuditoriumFetchError("");
    const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/auditoriums`;
    console.log("[API Call] Fetching auditoriums from:", apiUrl);
    try {
      const response = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });
  if (!response.ok) { let errorMsg = `Auditorium fetch failed (${response.status})`; try { const data = await response.json(); errorMsg = data.message || errorMsg; } catch { /* ignore */ } throw new Error(errorMsg); }
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) { setAuditoriums(data.data); }
      else { throw new Error(data.message || "Invalid format received for auditoriums."); }
    } catch (err) { console.error("Auditorium fetch error:", err); setAuditoriumFetchError(err.message || "Could not load auditorium list."); setAuditoriums([]); }
    finally { setIsLoadingAuditoriums(false); }
  }, []);

  const fetchDepartments = useCallback(async () => {
    setIsLoadingDepartments(true);
    setDepartmentFetchError("");
    const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/departments`;
    console.log("[API Call] Fetching departments from:", apiUrl);
    try {
      const response = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });
  if (!response.ok) { let errorMsg = `Department fetch failed (${response.status})`; try { const data = await response.json(); errorMsg = data.message || errorMsg; } catch { /* ignore */ } throw new Error(errorMsg); }
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) { setDepartments(data.data); }
      else { throw new Error(data.message || "Invalid format received for departments."); }
    } catch (err) { console.error("Department fetch error:", err); setDepartmentFetchError(err.message || "Could not load department list."); setDepartments([]); }
    finally { setIsLoadingDepartments(false); }
  }, []);

  const fetchAvailableAuditoriums = useCallback(async (startTime, endTime) => {
    if (!startTime || !endTime) {
      setAvailableAuditoriums([]);
      return;
    }

    setIsLoadingAvailableAuditoriums(true);
    setAuditoriumFetchError("");
    
    const token = localStorage.getItem('authToken');
    if (!token) {
      setAuditoriumFetchError("Authentication required");
      setIsLoadingAvailableAuditoriums(false);
      return;
    }

    const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/auditoriums/available`;
    const queryParams = new URLSearchParams({
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString()
    });

    console.log("[API Call] Fetching available auditoriums from:", `${apiUrl}?${queryParams}`);
    
    try {
      const response = await fetch(`${apiUrl}?${queryParams}`, { 
        headers: { 
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        } 
      });
      
      if (!response.ok) { 
        let errorMsg = `Available auditoriums fetch failed (${response.status})`; 
        try { 
          const data = await response.json(); 
          errorMsg = data.message || errorMsg; 
        } catch { /* ignore */ } 
        throw new Error(errorMsg); 
      }
      
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) { 
        setAvailableAuditoriums(data.data);
        
        // Clear selected auditorium if it's no longer available
        if (formData.auditoriumId && !data.data.find(aud => aud._id === formData.auditoriumId)) {
          setFormData(prev => ({ ...prev, auditoriumId: "" }));
        }
      }
      else { 
        throw new Error(data.message || "Invalid format received for available auditoriums."); 
      }
    } catch (err) { 
      console.error("Available auditoriums fetch error:", err); 
      setAuditoriumFetchError(err.message || "Could not load available auditoriums."); 
      setAvailableAuditoriums([]); 
    }
    finally { 
      setIsLoadingAvailableAuditoriums(false); 
    }
  }, [formData.auditoriumId]);

  /** Fetches existing bookings to check for conflicts */
  const checkBookingConflicts = useCallback(async () => {
    // This function is now deprecated - replaced by fetchAvailableAuditoriums
    // Keeping for backward compatibility but not used
  }, []);

  // --- Effect Hooks ---

  // Fetch initial dropdown data on component mount
  useEffect(() => {
    fetchAuditoriums();
    fetchDepartments();
  }, [fetchAuditoriums, fetchDepartments]);

  // Fetch available auditoriums when start/end times change
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (formData.startTime && formData.endTime) {
        try {
          const start = new Date(formData.startTime);
          const end = new Date(formData.endTime);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start < end) {
            fetchAvailableAuditoriums(formData.startTime, formData.endTime);
          } else {
            setAvailableAuditoriums([]);
          }
        } catch (e) {
          console.warn("Date validation error:", e);
          setAvailableAuditoriums([]);
        }
      } else {
        setAvailableAuditoriums([]);
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(debounceTimer);
  }, [formData.startTime, formData.endTime, fetchAvailableAuditoriums]);

  // Handle pre-filled auditorium from URL parameters
  useEffect(() => {
    const auditoriumParam = searchParams.get('auditorium');
    if (auditoriumParam && auditoriums.length > 0 && !formData.auditoriumId) {
      // Check if the auditorium ID exists in the fetched auditoriums
      const auditoriumExists = auditoriums.some(aud => aud._id === auditoriumParam);
      if (auditoriumExists) {
        setFormData(prev => ({ ...prev, auditoriumId: auditoriumParam }));
        // Show a helpful toast message only once
        const selectedAuditorium = auditoriums.find(aud => aud._id === auditoriumParam);
        if (selectedAuditorium) {
          showToast("info", `${selectedAuditorium.name} has been pre-selected for booking.`);
        }
      }
    }
  }, [searchParams, auditoriums, formData.auditoriumId]);

  // Cleanup object URLs when component unmounts or when eventPoster changes
  useEffect(() => {
    return () => {
      // Clean up preview URL when component unmounts
      if (imagePreviewUrl) {
        console.log("Component unmounting, cleaning up preview URL:", imagePreviewUrl);
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  // --- Form Input Handlers ---
  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear any previous messages when input changes
    if (['auditoriumId', 'startTime', 'endTime'].includes(name)) {
      setSubmitError(""); 
      setSuccessMessage("");
    }
  }
  function handleFileChange(e) {
    const file = e.target.files[0];
    console.log("File change triggered:", file ? file.name : "No file selected");
    
    // Clean up previous preview URL
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    
    if (file) {
      console.log("File details:", {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      });
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        console.error("Invalid file type:", file.type);
        showToast("error", "Please select a valid image file (JPEG, PNG, or GIF)");
        e.target.value = ''; // Clear the input
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        console.error("File too large:", file.size);
        showToast("error", "File size must be less than 5MB");
        e.target.value = ''; // Clear the input
        return;
      }
      
      console.log("File validation passed, creating preview URL");
      
      // Create preview URL
      try {
        const previewUrl = URL.createObjectURL(file);
        console.log("Created preview URL:", previewUrl);
        setImagePreviewUrl(previewUrl);
      } catch (error) {
        console.error("Error creating object URL:", error);
        showToast("error", "Error creating image preview");
        return;
      }
    }
    
    setFormData((prev) => {
      const updated = { ...prev, eventPoster: file || null };
      console.log("Updated form data with eventPoster:", updated.eventPoster ? "File selected" : "No file");
      return updated;
    });
  }
  function removePoster() {
    // Clean up the object URL
    if (imagePreviewUrl) {
      console.log("Cleaning up preview URL:", imagePreviewUrl);
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    
    setFormData((prev) => ({ ...prev, eventPoster: null }));
    const fileInput = document.querySelector('input[name="eventPoster"]');
    if (fileInput) fileInput.value = '';
    
    console.log("Poster removed and form data cleared");
  }


  // --- Form Submission Handler ---
  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!formData.eventName || !formData.startTime || !formData.endTime || !formData.auditoriumId || !formData.departmentId) { 
      showToast("error", "Please fill all required fields (*)."); 
      return; 
    }
    
    if (availableAuditoriums.length === 0) {
      showToast("error", "No auditorium selected or available for the selected time slot."); 
      return; 
    }
    
    try { 
      const start = new Date(formData.startTime); 
      const end = new Date(formData.endTime); 
      if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error("Invalid date."); 
      if (start >= end) throw new Error("End time must be after start."); 
    }
    catch (validationError) { 
      showToast("error", validationError.message); 
      return; 
    }
    
    setIsSubmitting(true); 
    console.log("[DEBUG] Submit initiated.");
    
    const token = localStorage.getItem('authToken'); 
    if (!token) { 
      showToast("error", "Authentication Error: Please log in again."); 
      setIsSubmitting(false); 
      return; 
    }
    
    const formDataToSend = new FormData(); 
    formDataToSend.append('eventName', formData.eventName); 
    formDataToSend.append('description', formData.description); 
    formDataToSend.append('startTime', new Date(formData.startTime).toISOString()); 
    formDataToSend.append('endTime', new Date(formData.endTime).toISOString()); 
    formDataToSend.append('auditorium', formData.auditoriumId); 
    formDataToSend.append('department', formData.departmentId); 
    if (formData.eventPoster) { 
      formDataToSend.append('eventPoster', formData.eventPoster, formData.eventPoster.name); 
    }
    
    const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/bookings`; 
    console.log("[DEBUG] POST to", apiUrl);
    
    try {
      const response = await fetch(apiUrl, { 
        method: "POST", 
        headers: { 
          "Authorization": `Bearer ${token}`, 
          "Accept": "application/json", 
        }, 
        body: formDataToSend, 
      });
      
      let responseData; 
      const contentType = response.headers.get("content-type"); 
      if (contentType?.includes("application/json")) { 
        responseData = await response.json(); 
      } else { 
        const text = await response.text(); 
        if (!response.ok) throw new Error(text || `Server error ${response.status}`); 
        else responseData = { success: true, message: 'Success (non-JSON).', data: null }; 
      }
      
      if (!response.ok || !responseData.success) throw new Error(responseData.message || `Submit failed.`);
      
      const successMsg = responseData.message || "Booking submitted!"; 
      showToast("success", successMsg);
      
      // Reset form
      setFormData({ 
        eventName: "", 
        description: "", 
        startTime: "", 
        endTime: "", 
        auditoriumId: "", 
        departmentId: "", 
        eventPoster: null 
      }); 
      removePoster();
      setAvailableAuditoriums([]);
      
    } catch (err) {
      console.error("Submit error:", err);
      if (err.message?.toLowerCase().includes("conflict") || err.message?.toLowerCase().includes("overlaps")) { 
        showToast("error", "Submit failed: Slot already booked. Please refresh and try again."); 
        // Refresh available auditoriums
        if (formData.startTime && formData.endTime) {
          fetchAvailableAuditoriums(formData.startTime, formData.endTime);
        }
      }
      else { 
        showToast("error", err.message || "Error submitting."); 
      }
    } finally { 
      setIsSubmitting(false); 
      console.log("[DEBUG] Submit finished."); 
    }
  }

  const getMinDateTimeLocal = () => {
      const now = new Date(); const minDate = new Date(now.getTime() + (2 * 60 * 60 * 1000)); // 2 hours ahead
      const offset = minDate.getTimezoneOffset() * 60000; const localISOTime = new Date(minDate.getTime() - offset).toISOString().slice(0, 16); return localISOTime;
  };

  // --- Render Component UI ---
  return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100 py-10 sm:py-16 px-4 sm:px-6 lg:px-8 pt-8">
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
        <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden">
          <div className="bg-red-700 p-4 sm:p-6 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight"> Auditorium Booking Request Form </h2>
            <p className="text-sm text-red-100 mt-1"> Fields marked with <span className="text-yellow-300 font-bold">*</span> are required. </p>
          </div>
          <div className="p-6 sm:p-10">
            {submitError && ( <div className="mb-6 p-3 text-center text-sm font-medium text-red-800 bg-red-100 rounded-md border border-red-200 shadow-sm" role="alert">{submitError}</div> )}
            {successMessage && ( <div className="mb-6 p-3 text-center text-sm font-medium text-green-800 bg-green-100 rounded-md border border-green-200 shadow-sm" role="alert">{successMessage}</div> )}
            <form onSubmit={handleSubmit} className="space-y-6">
              <InputField label="Event Name" name="eventName" value={formData.eventName} onChange={handleChange} disabled={isSubmitting} required={true} />
              
              <div> {/* Department Select */}
                <label htmlFor="departmentId" className="block text-sm font-semibold text-gray-700 mb-1"> Organizing Department <span className="text-red-500 ml-1">*</span> </label>
                <select 
                  id="departmentId" 
                  name="departmentId" 
                  value={formData.departmentId} 
                  onChange={handleChange} 
                  required 
                  className={`w-full border px-3 py-2 rounded-md text-sm ${
                    departmentFetchError ? 'border-red-500' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 
                    disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors
                    hover:border-red-400`}
                  disabled={isLoadingDepartments || !!departmentFetchError || departments.length === 0 || isSubmitting}
                >
                  <option value="" disabled> {isLoadingDepartments ? "Loading..." : departmentFetchError ? "Error Loading" : departments.length === 0 ? "No Depts" : "-- Select --"} </option>
                  {!isLoadingDepartments && !departmentFetchError && departments.map((dept) => (<option key={dept._id} value={dept._id}>{dept.name} {dept.code ? `(${dept.code})` : ''}</option>))}
                </select>
                {departmentFetchError && <p className="text-red-600 text-xs mt-1">{departmentFetchError}</p>}
              </div>

              <TextAreaField 
                label="Event Description" 
                name="description" 
                value={formData.description} 
                onChange={handleChange} 
                disabled={isSubmitting} 
                required={true} // Description is optional
              />
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <InputField 
                  label="Start Date & Time" 
                  name="startTime" 
                  type="datetime-local" 
                  value={formData.startTime} 
                  onChange={handleChange} 
                  disabled={isSubmitting} 
                  required={true} 
                  min={getMinDateTimeLocal()} 
                />
                <InputField 
                  label="End Date & Time" 
                  name="endTime" 
                  type="datetime-local" 
                  value={formData.endTime} 
                  onChange={handleChange} 
                  disabled={isSubmitting} 
                  required={true} 
                  min={formData.startTime || getMinDateTimeLocal()} 
                />
              </div>

              {/* Available Auditoriums Section */}
              <div>
                <label htmlFor="auditoriumId" className="block text-sm font-semibold text-gray-700 mb-1"> 
                  Available Auditoriums <span className="text-red-500 ml-1">*</span> 
                </label>
                
                {/* Show loading state for available auditoriums */}
                {isLoadingAvailableAuditoriums && (
                  <div className="text-blue-600 text-sm p-2 flex items-center">
                    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading available auditoriums...
                  </div>
                )}

                {/* Show message when no date/time selected */}
                {!formData.startTime || !formData.endTime ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4 text-center">
                    <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-gray-600">Please select start and end date/time to see available auditoriums</p>
                  </div>
                ) : availableAuditoriums.length === 0 && !isLoadingAvailableAuditoriums ? (
                  <div className="bg-red-50 border border-red-200 rounded-md p-4 text-center">
                    <svg className="mx-auto h-8 w-8 text-red-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-sm text-red-600 font-medium">No auditoriums available for the selected time slot</p>
                    <p className="text-xs text-red-500 mt-1">Please try a different date and time</p>
                  </div>
                ) : (
                  <div className="relative">
                    <select 
                      id="auditoriumId" 
                      name="auditoriumId" 
                      value={formData.auditoriumId} 
                      onChange={handleChange} 
                      required 
                      className={`w-full border px-3 py-3 pr-10 rounded-lg text-sm appearance-none bg-white ${
                        auditoriumFetchError ? 'border-red-500' : 'border-gray-300'
                      } focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 
                        disabled:bg-gray-50 disabled:cursor-not-allowed transition-all duration-200
                        hover:border-red-400 hover:shadow-sm`}
                      disabled={isLoadingAvailableAuditoriums || availableAuditoriums.length === 0 || isSubmitting}
                    >
                      <option value="" disabled className="text-gray-500"> 
                        {isLoadingAvailableAuditoriums ? "Loading available auditoriums..." : 
                         auditoriumFetchError ? "Error loading auditoriums" : 
                         availableAuditoriums.length === 0 ? "No auditoriums available" : "Choose an available auditorium"} 
                      </option>
                      {!isLoadingAvailableAuditoriums && !auditoriumFetchError && availableAuditoriums.map((audi) => (
                        <option key={audi._id} value={audi._id} className="py-2">
                          {audi.name} ({audi.location || 'Location N/A'}) • Capacity: {audi.capacity || 'TBD'}
                        </option>
                      ))}
                    </select>
                    {/* Custom dropdown arrow */}
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}
                
                {auditoriumFetchError && <p className="text-red-600 text-xs mt-1">{auditoriumFetchError}</p>}
                
                {/* Show selected auditorium details */}
                {formData.auditoriumId && availableAuditoriums.length > 0 && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                    {(() => {
                      const selectedAudi = availableAuditoriums.find(a => a._id === formData.auditoriumId);
                      if (!selectedAudi) return null;
                      return (
                        <div className="flex items-center text-sm">
                          <svg className="h-4 w-4 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-green-800">
                            <span className="font-semibold">{selectedAudi.name}</span> is available 
                            {selectedAudi.capacity && ` (Capacity: ${selectedAudi.capacity})`}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Event Poster File Input Area */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Event Poster (Optional, Max 5MB, Image files only)
                </label>
                {!formData.eventPoster ? (
                  // Display file input drop zone
                  <div className="relative w-full h-36 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 transition duration-150 flex items-center justify-center cursor-pointer group">
                    <div className="text-center pointer-events-none">
                      <svg className="mx-auto h-10 w-10 text-gray-400 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                      </svg>
                      <p className="text-sm text-gray-500 group-hover:text-gray-600 mt-1">Click or drag image here</p>
                      <p className="text-xs text-gray-400 group-hover:text-gray-500">PNG, JPG, GIF up to 5MB</p>
                    </div>
                    <input
                      type="file"
                      name="eventPoster"
                      accept="image/png, image/jpeg, image/gif"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={isSubmitting}
                    />
                  </div>
                ) : (
                  // Display preview and remove button
                  <div className="relative mt-2 w-48 h-48 sm:w-56 sm:h-56">
                    {imagePreviewUrl ? (
                      <img
                        src={imagePreviewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover rounded-lg border border-gray-300"
                        onLoad={(e) => {
                          console.log("Image preview loaded successfully for:", e.target.src);
                        }}
                        onError={(e) => {
                          console.error("Error loading image preview:", e);
                          console.error("Failed URL:", e.target.src);
                          showToast("error", "Error loading image preview");
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100 border border-gray-300 rounded-lg">
                        <p className="text-gray-500 text-sm">Loading preview...</p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={removePoster}
                      disabled={isSubmitting}
                      className="absolute -top-2 -right-2 bg-red-100 rounded-full p-1 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      title="Remove image"
                    >
                      <svg
                        className="w-5 h-5 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M6 18L18 6M6 6l12 12"
                        ></path>
                      </svg>
                    </button>
                  </div>
                )}
                
                {/* File Information Display */}
                {formData.eventPoster && (
                  <div className="mt-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                    <p><strong>File:</strong> {formData.eventPoster.name}</p>
                    <p><strong>Size:</strong> {(formData.eventPoster.size / 1024 / 1024).toFixed(2)} MB</p>
                    <p><strong>Type:</strong> {formData.eventPoster.type}</p>
                  </div>
                )}
              </div>

              {/* Submit Button Area */}
              <div className="pt-6 border-t border-gray-200 text-center">
                <button
                  type="submit"
                  // Disable button if essential data is loading, conflicts exist, or already submitting
                  disabled={
                    isSubmitting || 
                    isLoadingDepartments || 
                    isLoadingAvailableAuditoriums ||
                    availableAuditoriums.length === 0 ||
                    !!departmentFetchError || 
                    !!auditoriumFetchError ||
                    !formData.startTime ||
                    !formData.endTime ||
                    !formData.auditoriumId
                  }
                  className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-3 text-white bg-red-700 hover:bg-red-800 focus:outline-none focus:ring-4 focus:ring-red-300 rounded-lg text-lg font-semibold transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                  {isSubmitting ? (
                    <>
                      {/* Loading Spinner */}
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Submitting...
                    </>
                  ) : availableAuditoriums.length === 0 && (formData.startTime && formData.endTime) ? (
                    "No Available Auditoriums"
                  ) : !formData.startTime || !formData.endTime ? (
                    "Select Date & Time First"
                  ) : (
                    "Submit Booking Request"
                  )}
                </button>
              </div>
              {/* End Submit Button */}
            </form>
            {/* End Form Element */}
          </div>
        </div>
  </div>
  );
}

export default BookAuditorium;