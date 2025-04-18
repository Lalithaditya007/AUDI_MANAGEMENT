import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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

function BookAuditorium({ userEmail = "" }) {
  const navigate = useNavigate();

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
  const [auditoriums, setAuditoriums] = useState([]);
  const [isLoadingAuditoriums, setIsLoadingAuditoriums] = useState(false);
  const [auditoriumFetchError, setAuditoriumFetchError] = useState("");
  const [departments, setDepartments] = useState([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [departmentFetchError, setDepartmentFetchError] = useState("");

  // Booking conflicts state
  const [conflicts, setConflicts] = useState([]);
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false);
  const [conflictError, setConflictError] = useState("");

  // Submission/Feedback State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [isSlotAvailable, setIsSlotAvailable] = useState(true);
  const [conflictingBookingDetails, setConflictingBookingDetails] = useState(null);

  // --- Helper: Show temporary feedback ---
  const showTemporaryFeedback = (setter, message, duration = 5000) => {
    setter(message);
    const timer = setTimeout(() => setter(""), duration);
    return () => clearTimeout(timer);
  };

  // --- Data Fetching Callbacks ---
  const fetchAuditoriums = useCallback(async () => {
    setIsLoadingAuditoriums(true);
    setAuditoriumFetchError("");
    const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/auditoriums`;
    console.log("[API Call] Fetching auditoriums from:", apiUrl);
    try {
      const response = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });
      if (!response.ok) { let errorMsg = `Auditorium fetch failed (${response.status})`; try { const data = await response.json(); errorMsg = data.message || errorMsg; } catch (e) { /* ignore */ } throw new Error(errorMsg); }
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
      if (!response.ok) { let errorMsg = `Department fetch failed (${response.status})`; try { const data = await response.json(); errorMsg = data.message || errorMsg; } catch (e) { /* ignore */ } throw new Error(errorMsg); }
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) { setDepartments(data.data); }
      else { throw new Error(data.message || "Invalid format received for departments."); }
    } catch (err) { console.error("Department fetch error:", err); setDepartmentFetchError(err.message || "Could not load department list."); setDepartments([]); }
    finally { setIsLoadingDepartments(false); }
  }, []);

  /** Fetches existing bookings to check for conflicts */
  const checkBookingConflicts = useCallback(async () => {
    setConflicts([]);
    setConflictError("");
    
    if (!formData.auditoriumId || !formData.startTime || !formData.endTime) {
        return;
    }
    
    setIsCheckingConflicts(true);
    
    const startDate = new Date(formData.startTime);
    const endDate = new Date(formData.endTime);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate >= endDate) {
        setIsCheckingConflicts(false);
        return;
    }
    
    try {
        const token = localStorage.getItem('authToken');
        if (!token) {
            throw new Error("Authentication token missing. Please log in again.");
        }
        
        const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/bookings/check-availability`;
        const queryParams = new URLSearchParams({
            auditoriumId: formData.auditoriumId,
            startTime: startDate.toISOString(),
            endTime: endDate.toISOString(),
            year: startDate.getFullYear(),
            month: startDate.getMonth() + 1 // JavaScript months are 0-based
        });

        const response = await fetch(`${apiUrl}?${queryParams}`, {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || `Check failed (${response.status})`);
        }
        
        if (data.success) {
            setIsSlotAvailable(!data.hasConflict);
            if (data.hasConflict && data.conflictingBooking) {
                setConflicts([data.conflictingBooking]);
            } else {
                setConflicts([]);
            }
        } else {
            throw new Error(data.message || "Failed to check availability");
        }
    } catch (err) {
        console.error("Availability check error:", err);
        setConflictError(err.message || "Could not check availability");
        setConflicts([]);
    } finally {
        setIsCheckingConflicts(false);
    }
}, [formData.auditoriumId, formData.startTime, formData.endTime]);

  // --- Effect Hooks ---

  // Fetch initial dropdown data on component mount
  useEffect(() => {
    fetchAuditoriums();
    fetchDepartments();
  }, [fetchAuditoriums, fetchDepartments]);

  // Check for conflicts when relevant form fields change
  useEffect(() => {
    // Set a debounce timer to avoid too many API calls while user is typing
    const debounceTimer = setTimeout(() => {
      if (formData.auditoriumId && formData.startTime && formData.endTime) {
        checkBookingConflicts();
      }
    }, 500); // 500ms debounce
    
    return () => clearTimeout(debounceTimer);
  }, [formData.auditoriumId, formData.startTime, formData.endTime, checkBookingConflicts]);

  // --- Form Input Handlers ---
  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear any previous conflict messages when input changes
    if (['auditoriumId', 'startTime', 'endTime'].includes(name)) {
      setConflicts([]);
      setConflictError("");
      setSubmitError(""); 
      setSuccessMessage("");
    }
  }
  function handleFileChange(e) {
    const file = e.target.files[0];
    setFormData((prev) => ({ ...prev, eventPoster: file || null }));
  }
  function removePoster() {
    setFormData((prev) => ({ ...prev, eventPoster: null }));
    const fileInput = document.querySelector('input[name="eventPoster"]');
    if (fileInput) fileInput.value = null;
  }

  // --- Availability Check Logic ---
  const checkSlotAvailability = useCallback(async (auditoriumId, startTimeStr, endTimeStr) => {
    setIsSlotAvailable(true);
    setConflictingBookingDetails(null);
    setAvailabilityError("");

    if (!auditoriumId || !startTimeStr || !endTimeStr) {
        return;
    }

    setIsCheckingAvailability(true);

    try {
        const token = localStorage.getItem('authToken');
        if (!token) throw new Error("Authentication required.");

        const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/bookings/check-availability`;
        const queryParams = new URLSearchParams({
            auditoriumId,
            startTime: startTimeStr,
            endTime: endTimeStr
        });

        const response = await fetch(`${apiUrl}?${queryParams}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `Check failed (${response.status})`);
        }

        setIsSlotAvailable(data.available);
        if (data.hasConflict && data.conflictingBooking) {
            setConflictingBookingDetails(data.conflictingBooking);
            setConflicts([data.conflictingBooking]);
        } else {
            setConflictingBookingDetails(null);
            setConflicts([]);
        }
        setConflictError("");

    } catch (err) {
        console.error("Availability check error:", err);
        setConflictError(err.message || "Could not check availability");
        setIsSlotAvailable(false);
        setConflicts([]);
    } finally {
        setIsCheckingAvailability(false);
    }
}, []);

  const debouncedCheckAvailability = useMemo(() => debounce(checkSlotAvailability, 750), [checkSlotAvailability]);

  useEffect(() => {
    if (formData.auditoriumId && formData.startTime && formData.endTime) {
      try {
        const start = new Date(formData.startTime); const end = new Date(formData.endTime);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start < end) { debouncedCheckAvailability(formData.auditoriumId, formData.startTime, formData.endTime); }
        else { setIsSlotAvailable(false); setAvailabilityError("Please select a valid start and end time."); setConflictingBookingDetails(null); setIsCheckingAvailability(false); }
      } catch (e) { console.warn("Date parse useEffect:", e); setIsSlotAvailable(false); setAvailabilityError("Invalid date format."); setConflictingBookingDetails(null); setIsCheckingAvailability(false); }
    } else { setIsSlotAvailable(true); setConflictingBookingDetails(null); setAvailabilityError(""); setIsCheckingAvailability(false); }
  }, [formData.auditoriumId, formData.startTime, formData.endTime, debouncedCheckAvailability]);


  // --- Form Submission Handler ---
  async function handleSubmit(e) {
    e.preventDefault();
    if (isCheckingAvailability) { 
      showToast("warning", "Please wait, checking availability..."); 
      return; 
    }
    if (!isSlotAvailable) { 
      showToast("error", "Cannot submit: Slot unavailable or input invalid."); 
      return; 
    }
    if (!formData.eventName || !formData.startTime || !formData.endTime || !formData.auditoriumId || !formData.departmentId) { 
      showToast("error", "Please fill all required fields (*)."); 
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
      const response = await fetch(apiUrl, { method: "POST", headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json", }, body: formDataToSend, });
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
      setFormData({ eventName: "", description: "", startTime: "", endTime: "", auditoriumId: "", departmentId: "", eventPoster: null }); 
      removePoster();
      setIsSlotAvailable(true); 
      setAvailabilityError(""); 
      setConflictingBookingDetails(null); // Reset check state
    } catch (err) {
      console.error("Submit error:", err);
      if (err.message?.toLowerCase().includes("conflict") || err.message?.toLowerCase().includes("overlaps")) { 
        showToast("error", "Submit failed: Slot already booked."); 
        setIsSlotAvailable(false); 
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
    <>
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100 py-10 sm:py-16 px-4 sm:px-6 lg:px-8">
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
              <div> {/* Auditorium Select */}
                <label htmlFor="auditoriumId" className="block text-sm font-semibold text-gray-700 mb-1"> 
                  Auditorium <span className="text-red-500 ml-1">*</span> 
                </label>
                <select 
                  id="auditoriumId" 
                  name="auditoriumId" 
                  value={formData.auditoriumId} 
                  onChange={handleChange} 
                  required 
                  className={`w-full border px-3 py-2 rounded-md text-sm ${
                    auditoriumFetchError ? 'border-red-500' : 'border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 
                    disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors
                    hover:border-red-400`}
                  disabled={isLoadingAuditoriums || !!auditoriumFetchError || auditoriums.length === 0 || isSubmitting}
                >
                  <option value="" disabled> {isLoadingAuditoriums ? "Loading..." : auditoriumFetchError ? "Error Loading" : auditoriums.length === 0 ? "No Audis" : "-- Select --"} </option>
                  {!isLoadingAuditoriums && !auditoriumFetchError && auditoriums.map((audi) => (<option key={audi._id} value={audi._id}>{audi.name} ({audi.location || 'N/A'}) - Cap: {audi.capacity || '?'}</option>))}
                </select>
                {auditoriumFetchError && <p className="text-red-600 text-xs mt-1">{auditoriumFetchError}</p>}
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

              {/* Booking Conflicts Warning */}
              {isCheckingConflicts && (
                <div className="text-yellow-600 text-sm p-2 flex items-center justify-center">
                  <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Checking availability...
                </div>
              )}
              
              {conflictError && (
                <div className="text-red-600 text-sm p-2">
                  Error checking for conflicts: {conflictError}
                </div>
              )}
              
              {conflicts.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-blue-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-blue-800 font-medium">Schedule Overlap Detected</span>
                  </div>
                  <p className="text-sm text-blue-700 mt-2">
                    The requested time slot overlaps with existing bookings:
                  </p>
                  <ul className="mt-3 space-y-2 text-sm">
                    {conflicts.slice(0, 3).map((booking, idx) => {
                      // Format the dates properly
                      const startDate = new Date(booking.startTime);
                      const endDate = new Date(booking.endTime);
                      
                      // Check if dates are valid before formatting
                      const isValidDate = !isNaN(startDate.getTime()) && !isNaN(endDate.getTime());
                      
                      // Check if it's a multi-day event
                      const isMultiDay = isValidDate && 
                        startDate.toDateString() !== endDate.toDateString();
                      
                      return (
                        <li key={idx} className="bg-white bg-opacity-50 rounded p-2 border border-blue-100">
                          <div className="font-medium text-blue-900">{booking.eventName}</div>
                          {isValidDate ? (
                            <div className="text-blue-600 text-xs mt-1">
                              <span>
                                {startDate.toLocaleDateString('en-US', { 
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric', 
                                  year: 'numeric'
                                })} {' '}
                                {startDate.toLocaleTimeString('en-US', { 
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </span>
                              
                              {' - '}
                              
                              <span>
                                {isMultiDay && (
                                  <>{endDate.toLocaleDateString('en-US', { 
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })} {' '}</>
                                )}
                                {endDate.toLocaleTimeString('en-US', { 
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </span>
                              
                              {isMultiDay && (
                                <div className="text-xs mt-0.5 font-semibold text-red-600">
                                  (Multi-day event)
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-red-500 text-xs mt-1">
                              Invalid date format
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {conflicts.length > 3 && (
                    <p className="text-sm text-blue-600 mt-2 italic">
                      ...and {conflicts.length - 3} more overlapping events
                    </p>
                  )}
                  <p className="text-sm text-blue-700 mt-3">
                    Please select a different time slot to proceed with your booking.
                  </p>
                </div>
              )}
              
              {formData.auditoriumId && formData.startTime && formData.endTime && 
               !isCheckingConflicts && !conflictError && conflicts.length === 0 && (
                <div className="bg-green-50 border border-green-200 rounded-md p-2 flex items-center">
                  <svg className="h-5 w-5 text-green-500 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span className="text-green-700 text-sm">Time slot available</span>
                </div>
              )}

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
                    <img
                      src={URL.createObjectURL(formData.eventPoster)}
                      alt="Preview"
                      className="w-full h-full object-cover rounded-lg"
                      onLoad={(e) => URL.revokeObjectURL(e.target.src)} // Revoke object URL after load
                    />
                    <button
                      type="button"
                      onClick={removePoster}
                      disabled={isSubmitting}
                      className="absolute -top-2 -right-2 bg-red-100 rounded-full p-1 hover:bg-red-200"
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
              </div>

              {/* Submit Button Area */}
              <div className="pt-6 border-t border-gray-200 text-center">
                <button
                  type="submit"
                  // Disable button if essential data is loading, conflicts exist, or already submitting
                  disabled={
                    isSubmitting || 
                    isLoadingAuditoriums || 
                    isLoadingDepartments || 
                    isCheckingConflicts ||
                    conflicts.length > 0 ||
                    !!auditoriumFetchError || 
                    !!departmentFetchError || 
                    !!conflictError
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
                  ) : conflicts.length > 0 ? (
                    "Time Slot Unavailable"
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
    </>
  );
}

export default BookAuditorium;