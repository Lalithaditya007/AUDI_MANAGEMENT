import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

// --- Helper Components ---

function InputField({
  label,
  name,
  type = "text",
  value,
  onChange,
  required = true,
  disabled = false,
  min // Add min prop for datetime-local
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-semibold text-gray-700 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        id={name}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        min={min} // Pass min attribute for datetime-local
        className="w-full border border-gray-300 px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-red-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
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

  // --- Effect Hook for Initial Data ---
  useEffect(() => {
    fetchAuditoriums();
    fetchDepartments();
  }, [fetchAuditoriums, fetchDepartments]);

  // --- Form Input Handlers ---
  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (['startTime', 'endTime', 'auditoriumId'].includes(name)) {
        setSubmitError(""); setSuccessMessage("");
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
    setIsSlotAvailable(true); setConflictingBookingDetails(null); setAvailabilityError(""); // Reset first
    if (!auditoriumId || !startTimeStr || !endTimeStr) { return; }
    let startDateTime, endDateTime;
    try {
      startDateTime = new Date(startTimeStr); endDateTime = new Date(endTimeStr);
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) throw new Error("Invalid date/time format.");
      if (startDateTime >= endDateTime) throw new Error("End time must be after start time.");
    } catch (dateError) { console.warn("Avail check skip:", dateError.message); setAvailabilityError(dateError.message); setIsSlotAvailable(false); return; }
    const startTimeISO = startDateTime.toISOString(); const endTimeISO = endDateTime.toISOString();
    console.log(`Checking: Audi=${auditoriumId}, Start=${startTimeISO}, End=${endTimeISO}`);
    setIsCheckingAvailability(true);
    try {
      const token = localStorage.getItem('authToken'); if (!token) throw new Error("Authentication required.");
      const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/bookings/check-availability`;
      const queryParams = new URLSearchParams({ auditoriumId, startTime: startTimeISO, endTime: endTimeISO });
      const response = await fetch(`${apiUrl}?${queryParams.toString()}`, { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json', }, });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || `Check failed (Status ${response.status})`);
      setIsSlotAvailable(data.available);
      if (!data.available && data.conflictingBooking) { setConflictingBookingDetails(data.conflictingBooking); }
      else { setConflictingBookingDetails(null); }
       setAvailabilityError(""); // Clear error on success
    } catch (err) {
      console.error("Avail check error:", err); setAvailabilityError(err.message || "Could not verify availability."); setIsSlotAvailable(false); setConflictingBookingDetails(null);
    } finally { setIsCheckingAvailability(false); }
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
    setSubmitError(""); setSuccessMessage("");
    if (isCheckingAvailability) { showTemporaryFeedback(setSubmitError, "Please wait, checking availability..."); return; }
    if (!isSlotAvailable) { showTemporaryFeedback(setSubmitError, "Cannot submit: Slot unavailable or input invalid."); return; }
    if (!formData.eventName || !formData.startTime || !formData.endTime || !formData.auditoriumId || !formData.departmentId) { showTemporaryFeedback(setSubmitError, "Please fill all required fields (*)."); return; }
    try { const start = new Date(formData.startTime); const end = new Date(formData.endTime); if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new Error("Invalid date."); if (start >= end) throw new Error("End time must be after start."); }
    catch (validationError) { showTemporaryFeedback(setSubmitError, validationError.message); return; }
    setIsSubmitting(true); console.log("[DEBUG] Submit initiated.");
    const token = localStorage.getItem('authToken'); if (!token) { showTemporaryFeedback(setSubmitError, "Auth Error."); setIsSubmitting(false); return; }
    const formDataToSend = new FormData(); formDataToSend.append('eventName', formData.eventName); formDataToSend.append('description', formData.description); formDataToSend.append('startTime', new Date(formData.startTime).toISOString()); formDataToSend.append('endTime', new Date(formData.endTime).toISOString()); formDataToSend.append('auditorium', formData.auditoriumId); formDataToSend.append('department', formData.departmentId); if (formData.eventPoster) { formDataToSend.append('eventPoster', formData.eventPoster, formData.eventPoster.name); }
    const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/bookings`; console.log("[DEBUG] POST to", apiUrl);
    try {
      const response = await fetch(apiUrl, { method: "POST", headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json", }, body: formDataToSend, });
      let responseData; const contentType = response.headers.get("content-type"); if (contentType?.includes("application/json")) { responseData = await response.json(); } else { const text = await response.text(); if (!response.ok) throw new Error(text || `Server error ${response.status}`); else responseData = { success: true, message: 'Success (non-JSON).', data: null }; }
      if (!response.ok || !responseData.success) throw new Error(responseData.message || `Submit failed.`);
      const successMsg = responseData.message || "Booking submitted!"; showTemporaryFeedback(setSuccessMessage, successMsg, 7000);
      setFormData({ eventName: "", description: "", startTime: "", endTime: "", auditoriumId: "", departmentId: "", eventPoster: null }); removePoster();
      setIsSlotAvailable(true); setAvailabilityError(""); setConflictingBookingDetails(null); // Reset check state
    } catch (err) {
      console.error("Submit error:", err);
      if (err.message?.toLowerCase().includes("conflict") || err.message?.toLowerCase().includes("overlaps")) { setSubmitError("Submit failed: Slot already booked."); setIsSlotAvailable(false); }
      else { setSubmitError(err.message || "Error submitting."); }
    } finally { setIsSubmitting(false); console.log("[DEBUG] Submit finished."); }
  } // --- End handleSubmit ---

  const getMinDateTimeLocal = () => {
      const now = new Date(); const minDate = new Date(now.getTime() + (2 * 60 * 60 * 1000)); // 2 hours ahead
      const offset = minDate.getTimezoneOffset() * 60000; const localISOTime = new Date(minDate.getTime() - offset).toISOString().slice(0, 16); return localISOTime;
  };

  // --- Render Component UI ---
  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100 py-10 sm:py-16 px-4 sm:px-6 lg:px-8">
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
                <select id="departmentId" name="departmentId" value={formData.departmentId} onChange={handleChange} required className={`w-full border px-3 py-2 rounded ... ${departmentFetchError ? 'border-red-500' : 'border-gray-300'}`} disabled={isLoadingDepartments || !!departmentFetchError || departments.length === 0 || isSubmitting}>
                  <option value="" disabled> {isLoadingDepartments ? "Loading..." : departmentFetchError ? "Error Loading" : departments.length === 0 ? "No Depts" : "-- Select --"} </option>
                  {!isLoadingDepartments && !departmentFetchError && departments.map((dept) => (<option key={dept._id} value={dept._id}>{dept.name} {dept.code ? `(${dept.code})` : ''}</option>))}
                </select>
                {departmentFetchError && <p className="text-red-600 text-xs mt-1">{departmentFetchError}</p>}
              </div>
              <div> {/* Auditorium Select */}
                <label htmlFor="auditoriumId" className="block text-sm font-semibold text-gray-700 mb-1"> Auditorium <span className="text-red-500 ml-1">*</span> </label>
                <select id="auditoriumId" name="auditoriumId" value={formData.auditoriumId} onChange={handleChange} required className={`w-full border px-3 py-2 rounded ... ${auditoriumFetchError ? 'border-red-500' : 'border-gray-300'}`} disabled={isLoadingAuditoriums || !!auditoriumFetchError || auditoriums.length === 0 || isSubmitting}>
                  <option value="" disabled> {isLoadingAuditoriums ? "Loading..." : auditoriumFetchError ? "Error Loading" : auditoriums.length === 0 ? "No Audis" : "-- Select --"} </option>
                  {!isLoadingAuditoriums && !auditoriumFetchError && auditoriums.map((audi) => (<option key={audi._id} value={audi._id}>{audi.name} ({audi.location || 'N/A'}) - Cap: {audi.capacity || '?'}</option>))}
                </select>
                {auditoriumFetchError && <p className="text-red-600 text-xs mt-1">{auditoriumFetchError}</p>}
              </div>
              <TextAreaField label="Event Description" name="description" value={formData.description} onChange={handleChange} disabled={isSubmitting} required={false} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6"> {/* Date Inputs */}
                 <InputField label="Start Date & Time" name="startTime" type="datetime-local" value={formData.startTime} onChange={handleChange} disabled={isSubmitting} required={true} min={getMinDateTimeLocal()} />
                 <InputField label="End Date & Time" name="endTime" type="datetime-local" value={formData.endTime} onChange={handleChange} disabled={isSubmitting} required={true} min={formData.startTime || getMinDateTimeLocal()} />
              </div>

              {/* Availability Feedback - Reduced spacing */}
              <div className="min-h-[24px] text-sm"> {/* Reduced min-height */}
                {isCheckingAvailability && (
                  <p className="text-gray-500 italic flex items-center animate-pulse">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    Checking availability...
                  </p>
                )}
                {!isCheckingAvailability && availabilityError && (
                  <p className="text-red-600 font-semibold">{availabilityError}</p>
                )}
                {!isCheckingAvailability && !availabilityError && !isSlotAvailable && conflictingBookingDetails && (
                  <div className="text-yellow-800 bg-yellow-50 p-3 rounded-md border border-yellow-200">
                    <p className="font-bold mb-1">Slot Unavailable</p>
                    <div className="text-sm space-y-1">
                      <p>Conflicts with event: <span className="font-semibold">"{conflictingBookingDetails.eventName}"</span></p>
                      <p>Organized by: <span className="font-semibold">{conflictingBookingDetails.department || 'N/A'}</span></p>
                      <p>Timing: <span className="font-semibold">
                        {new Date(conflictingBookingDetails.startTime).toLocaleString('en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                        {' - '}
                        {new Date(conflictingBookingDetails.endTime).toLocaleString('en-US', {
                          timeStyle: 'short'
                        })}
                      </span></p>
                    </div>
                  </div>
                )}
                {!isCheckingAvailability && !availabilityError && isSlotAvailable && formData.auditoriumId && formData.startTime && formData.endTime && (new Date(formData.startTime) < new Date(formData.endTime)) && (
                  <p className="text-green-700 font-semibold flex items-center">
                    <svg className="w-4 h-4 mr-1.5 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    Time slot appears available.
                  </p>
                )}
              </div>

              {/* Event Poster - Always visible */}
              <div className="mt-4"> {/* Event Poster */}
                <label className="block text-sm font-semibold text-gray-700 mb-2">Event Poster (Optional, Max 5MB)</label>
                {!formData.eventPoster ? (
                  <div className="relative group w-full h-36 border-2 border-dashed rounded-lg border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-100">
                    <div className="text-center pointer-events-none">
                      <p className="text-gray-500">Click or drag to upload poster</p>
                    </div>
                    <input type="file" name="eventPoster" accept="image/png, image/jpeg, image/gif" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" disabled={isSubmitting} />
                  </div>
                ) : (
                  <div className="relative mt-2 group w-48 h-48 sm:w-56 sm:h-56">
                    <img src={URL.createObjectURL(formData.eventPoster)} alt="Preview" className="w-full h-full object-cover rounded-lg" onLoad={(e) => URL.revokeObjectURL(e.target.src)}/>
                    <button type="button" onClick={removePoster} disabled={isSubmitting} className="absolute -top-2 -right-2 bg-red-100 rounded-full p-1 hover:bg-red-200">
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                  </div>
                )}
              </div>

               <div className="pt-6 border-t border-gray-200 text-center"> {/* Submit Button */}
                 <button
                   type="submit"
                   disabled={ // Final check on disabled logic
                       !isSlotAvailable || isCheckingAvailability || isSubmitting ||
                       isLoadingAuditoriums || isLoadingDepartments ||
                       !!auditoriumFetchError || !!departmentFetchError ||
                       !formData.auditoriumId || !formData.departmentId ||
                       !formData.startTime || !formData.endTime ||
                       // Also disable if the input times are known to be invalid
                       (formData.startTime && formData.endTime && new Date(formData.startTime) >= new Date(formData.endTime))
                   }
                   className="w-full sm:w-auto inline-flex justify-center items-center px-8 py-3 text-white bg-red-700 hover:bg-red-800 focus:outline-none focus:ring-4 focus:ring-red-300 rounded-lg text-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ..."
                 >
                   {isSubmitting ? (<>{/* Spinner */} Submitting...</> ) : ( "Submit Booking Request" )}
                 </button>
               </div>
             </form>
          </div>
        </div>
      </div>
    </>
  );
}

export default BookAuditorium;