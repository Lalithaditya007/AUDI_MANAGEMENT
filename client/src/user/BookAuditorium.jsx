import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

// --- Helper Components ---

function InputField({
  label,
  name,
  type = "text",
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
      <input
        id={name}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
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


// --- Main Booking Component ---

function BookAuditorium({ userEmail = "" /* Prop for display only, not used in logic */ }) {
  const navigate = useNavigate();

  // --- State Definitions ---
  const [formData, setFormData] = useState({
    eventName: "",
    description: "",
    startTime: "",
    endTime: "",
    auditoriumId: "",
    departmentId: "", // Added department
    eventPoster: null, // Holds the File object
  });

  // Data Loading State
  const [auditoriums, setAuditoriums] = useState([]);
  const [isLoadingAuditoriums, setIsLoadingAuditoriums] = useState(false);
  const [auditoriumFetchError, setAuditoriumFetchError] = useState("");

  const [departments, setDepartments] = useState([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [departmentFetchError, setDepartmentFetchError] = useState("");

  // Submission/Feedback State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // --- Helper: Show temporary feedback ---
  const showTemporaryFeedback = (setter, message, duration = 5000) => {
    setter(message);
    const timer = setTimeout(() => setter(""), duration);
    return () => clearTimeout(timer); // Return cleanup function
  };

  // --- Data Fetching Callbacks ---

  /** Fetches the list of available auditoriums. */
  const fetchAuditoriums = useCallback(async () => {
    setIsLoadingAuditoriums(true);
    setAuditoriumFetchError("");
    const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/auditoriums`;
    console.log("[API Call] Fetching auditoriums from:", apiUrl);

    try {
      const response = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });
      if (!response.ok) {
        let errorMsg = `Auditorium fetch failed (${response.status})`;
        try {
          const data = await response.json();
          errorMsg = data.message || errorMsg;
        } catch (e) { /* ignore parse error if response not JSON */ }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setAuditoriums(data.data);
        // Optional: Set a default selection if needed
        // if (data.data.length > 0 && !formData.auditoriumId) {
        //   setFormData(prev => ({...prev, auditoriumId: data.data[0]._id}));
        // }
      } else {
        throw new Error(data.message || "Invalid format received for auditoriums.");
      }
    } catch (err) {
      console.error("Auditorium fetch error:", err);
      setAuditoriumFetchError(err.message || "Could not load auditorium list.");
      setAuditoriums([]); // Clear data on error
    } finally {
      setIsLoadingAuditoriums(false);
    }
  }, []); // Empty dependency array as it doesn't depend on component state/props

  /** Fetches the list of available departments. */
  const fetchDepartments = useCallback(async () => {
    setIsLoadingDepartments(true);
    setDepartmentFetchError("");
    const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/departments`;
    console.log("[API Call] Fetching departments from:", apiUrl);

    try {
      // Assuming public endpoint, add Auth header if needed
      const response = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });
      if (!response.ok) {
        let errorMsg = `Department fetch failed (${response.status})`;
        try {
          const data = await response.json();
          errorMsg = data.message || errorMsg;
        } catch (e) { /* ignore */ }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setDepartments(data.data);
      } else {
        throw new Error(data.message || "Invalid format received for departments.");
      }
    } catch (err) {
      console.error("Department fetch error:", err);
      setDepartmentFetchError(err.message || "Could not load department list.");
      setDepartments([]); // Clear data on error
    } finally {
      setIsLoadingDepartments(false);
    }
  }, []); // Empty dependency array

  // --- Effect Hooks ---

  // Fetch initial dropdown data on component mount
  useEffect(() => {
    fetchAuditoriums();
    fetchDepartments();
  }, [fetchAuditoriums, fetchDepartments]); // Depend on the stable callback functions

  // --- Form Input Handlers ---

  /** Handles changes for standard text/date/select inputs. */
  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  /** Handles file input changes for the event poster. */
  function handleFileChange(e) {
    const file = e.target.files[0];
    // Optional: Add file size/type validation here
    // const maxSize = 5 * 1024 * 1024; // 5MB
    // const allowedTypes = ['image/png', 'image/jpeg', 'image/gif'];
    // if (file && file.size > maxSize) { alert('File is too large (Max 5MB)'); return; }
    // if (file && !allowedTypes.includes(file.type)) { alert('Invalid file type (PNG, JPG, GIF allowed)'); return; }

    setFormData((prev) => ({ ...prev, eventPoster: file || null }));
  }

  /** Removes the selected event poster file. */
  function removePoster() {
    setFormData((prev) => ({ ...prev, eventPoster: null }));
    // Also reset the file input element itself to allow re-uploading the same file
    const fileInput = document.querySelector('input[name="eventPoster"]');
    if (fileInput) fileInput.value = null;
  }

  // --- Form Submission Handler ---
  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");
    setSuccessMessage("");
    setIsSubmitting(true);
    console.log("[DEBUG] Form submit initiated. Data:", { ...formData, eventPoster: formData.eventPoster?.name }); // Log file name only

    // 1. Authentication Check
    const token = localStorage.getItem('authToken');
    if (!token) {
      showTemporaryFeedback(setSubmitError, "Authentication Error: Please log in again.");
      setIsSubmitting(false);
      return;
    }
    console.log("[DEBUG] Auth token retrieved.");

    // 2. Frontend Basic Validation
    if (!formData.eventName || !formData.startTime || !formData.endTime || !formData.auditoriumId || !formData.departmentId) {
      showTemporaryFeedback(setSubmitError, "Please fill in all required fields (marked with *).");
      setIsSubmitting(false);
      return;
    }

    // 3. Date/Time Validation
    try {
      const start = new Date(formData.startTime);
      const end = new Date(formData.endTime);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error("Invalid date format entered. Please use the date picker.");
      }
      if (start >= end) {
        throw new Error("End time must be strictly after the start time.");
      }
      // Optional: Add frontend validation for lead time (e.g., must be X hours in future)
      // const minBookingTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
      // if (start < minBookingTime) {
      //   throw new Error("Booking must be made at least 2 hours in advance.");
      // }
    } catch (validationError) {
      showTemporaryFeedback(setSubmitError, validationError.message);
      setIsSubmitting(false);
      return;
    }
    console.log("[DEBUG] Frontend validation passed.");

    // 4. Prepare FormData for multipart request
    const formDataToSend = new FormData();
    formDataToSend.append('eventName', formData.eventName);
    formDataToSend.append('description', formData.description);
    formDataToSend.append('startTime', new Date(formData.startTime).toISOString()); // Send ISO string for backend consistency
    formDataToSend.append('endTime', new Date(formData.endTime).toISOString());
    formDataToSend.append('auditorium', formData.auditoriumId); // Key matches backend `req.body.auditorium`
    formDataToSend.append('department', formData.departmentId); // Key matches backend `req.body.department`
    if (formData.eventPoster) {
      formDataToSend.append('eventPoster', formData.eventPoster, formData.eventPoster.name); // 'eventPoster' matches backend field
      console.log("[DEBUG] Appending file to FormData:", formData.eventPoster.name);
    } else {
      console.log("[DEBUG] No file appended to FormData.");
    }

    // 5. Make Fetch POST Request
    const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/bookings`;
    console.log("[DEBUG] Sending POST to", apiUrl);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          // ** DO NOT set 'Content-Type' header manually for FormData **
          // Browser sets it automatically with the correct boundary
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json", // We expect JSON response back
        },
        body: formDataToSend,
      });

      // 6. Handle Response
      let responseData;
      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        responseData = await response.json();
      } else {
        // Handle non-JSON responses (e.g., plain text errors, HTML error pages)
        const textResponse = await response.text();
        console.warn("[DEBUG] Received non-JSON response:", response.status, textResponse.substring(0, 200)); // Log snippet
        if (!response.ok) {
          // Use the text as message if available, otherwise generic status error
          throw new Error(textResponse || `Server responded with status ${response.status}`);
        } else {
          // Successful status code but unexpected non-JSON response
          responseData = { success: true, message: 'Booking submitted (received non-JSON success response).', data: null };
        }
      }

      console.log("[DEBUG] Backend response status:", response.status);
      console.log("[DEBUG] Backend response data:", responseData);

      if (!response.ok || !responseData.success) {
        // Use the message from JSON if available, otherwise throw generic error
        throw new Error(responseData.message || `Booking submission failed.`);
      }

      // --- Success ---
      const successMsg = responseData.message || "Booking request submitted successfully!";
      showTemporaryFeedback(setSuccessMessage, successMsg, 7000); // Show success message longer
      console.log("[SUCCESS] Booking submitted:", responseData.data?._id);

      // Reset form fully
      setFormData({
        eventName: "", description: "", startTime: "", endTime: "",
        auditoriumId: "", departmentId: "", eventPoster: null
      });
      removePoster(); // Ensure file input UI is also cleared

      // Optional: Navigate user after successful booking
      // navigate('/my-bookings'); // Example navigation

    } catch (err) {
      console.error("Booking submission process error:", err);
      // Display the specific error message caught
      showTemporaryFeedback(setSubmitError, err.message || "An error occurred. Please check details and try again.");
    } finally {
      setIsSubmitting(false);
      console.log("[DEBUG] Submission process finished.");
    }
  } // --- End handleSubmit ---


  // --- Render Component UI ---
  return (
    <>
      {/* Background Container */}
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100 py-10 sm:py-16 px-4 sm:px-6 lg:px-8">
        {/* Form Card */}
        <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden">
          {/* Card Header */}
          <div className="bg-red-700 p-4 sm:p-6 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Auditorium Booking Request Form
            </h2>
            <p className="text-sm text-red-100 mt-1">
              Fields marked with <span className="text-yellow-300 font-bold">*</span> are required.
            </p>
          </div>

          {/* Form Area with Padding */}
          <div className="p-6 sm:p-10">
            {/* Feedback Messages */}
            {submitError && (
              <div className="mb-6 p-3 text-center text-sm font-medium text-red-800 bg-red-100 rounded-md border border-red-200 shadow-sm transition duration-300 ease-in-out" role="alert">
                {submitError}
              </div>
            )}
            {successMessage && (
              <div className="mb-6 p-3 text-center text-sm font-medium text-green-800 bg-green-100 rounded-md border border-green-200 shadow-sm transition duration-300 ease-in-out" role="alert">
                {successMessage}
              </div>
            )}
            {/* End Feedback */}

            {/* Form Element */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Event Name Input */}
              <InputField
                label="Event Name"
                name="eventName"
                value={formData.eventName}
                onChange={handleChange}
                disabled={isSubmitting}
                required={true}
              />

              {/* Department Select Dropdown */}
              <div>
                <label htmlFor="departmentId" className="block text-sm font-semibold text-gray-700 mb-1">
                  Organizing Department <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  id="departmentId"
                  name="departmentId"
                  value={formData.departmentId}
                  onChange={handleChange}
                  required
                  className={`w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-red-400 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed ${departmentFetchError ? 'border-red-500' : 'border-gray-300'}`}
                  disabled={isLoadingDepartments || !!departmentFetchError || departments.length === 0 || isSubmitting}
                >
                  <option value="" disabled>
                    {isLoadingDepartments ? "Loading Departments..." :
                      departmentFetchError ? "Error Loading Departments" :
                        departments.length === 0 ? "No Departments Available" :
                          "-- Select Department --"}
                  </option>
                  {!isLoadingDepartments && !departmentFetchError && departments.map((dept) => (
                    <option key={dept._id} value={dept._id}>
                      {dept.name} {dept.code ? `(${dept.code})` : ''}
                    </option>
                  ))}
                </select>
                {departmentFetchError && <p className="text-red-600 text-xs mt-1">{departmentFetchError}</p>}
              </div>
              {/* End Department Select */}

              {/* Auditorium Select Dropdown */}
              <div>
                <label htmlFor="auditoriumId" className="block text-sm font-semibold text-gray-700 mb-1">
                  Auditorium <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  id="auditoriumId"
                  name="auditoriumId"
                  value={formData.auditoriumId}
                  onChange={handleChange}
                  required
                  className={`w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-red-400 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed ${auditoriumFetchError ? 'border-red-500' : 'border-gray-300'}`}
                  disabled={isLoadingAuditoriums || !!auditoriumFetchError || auditoriums.length === 0 || isSubmitting}
                >
                  <option value="" disabled>
                    {isLoadingAuditoriums ? "Loading Auditoriums..." :
                      auditoriumFetchError ? "Error Loading Auditoriums" :
                        auditoriums.length === 0 ? "No Auditoriums Available" :
                          "-- Select Auditorium --"}
                  </option>
                  {!isLoadingAuditoriums && !auditoriumFetchError && auditoriums.map((audi) => (
                    <option key={audi._id} value={audi._id}>
                      {audi.name} ({audi.location || 'N/A'}) - Cap: {audi.capacity || '?'}
                    </option>
                  ))}
                </select>
                {auditoriumFetchError && <p className="text-red-600 text-xs mt-1">{auditoriumFetchError}</p>}
              </div>
              {/* End Auditorium Select */}

              {/* Event Description Text Area */}
              <TextAreaField
                label="Event Description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={isSubmitting}
                required={false} // Description is optional
              />

              {/* Start/End Date & Time Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <InputField
                  label="Start Date & Time"
                  name="startTime"
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  required={true}
                />
                <InputField
                  label="End Date & Time"
                  name="endTime"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  required={true}
                />
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
                    {/* Actual file input is hidden but covers the area */}
                    <input
                      type="file"
                      name="eventPoster"
                      accept="image/png, image/jpeg, image/gif"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={isSubmitting}
                    />
                  </div>
                ) : (
                  // Display image preview and remove button
                  <div className="relative mt-2 group w-48 h-48 sm:w-56 sm:h-56 mx-auto sm:mx-0">
                    {/* Preview using Object URL */}
                    <img
                      src={URL.createObjectURL(formData.eventPoster)}
                      alt="Poster Preview"
                      className="w-full h-full object-cover border border-gray-300 rounded-lg shadow"
                      // Revoke object URL after load to free memory (browser caches it)
                      onLoad={(e) => URL.revokeObjectURL(e.target.src)}
                    />
                    <button
                      type="button" // Important: Prevent form submission
                      onClick={removePoster}
                      disabled={isSubmitting}
                      className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1.5 leading-none shadow-md opacity-70 group-hover:opacity-100 transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500 disabled:opacity-50"
                      title="Remove Poster"
                      aria-label="Remove Poster"
                    >
                      {/* Close Icon */}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              {/* End Event Poster */}

              {/* Submit Button Area */}
              <div className="pt-6 border-t border-gray-200 text-center">
                <button
                  type="submit"
                  // Disable button if essential data is loading, or already submitting
                  disabled={isSubmitting || isLoadingAuditoriums || isLoadingDepartments || !!auditoriumFetchError || !!departmentFetchError}
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
                  ) : (
                    "Submit Booking Request"
                  )}
                </button>
              </div>
              {/* End Submit Button */}
            </form>
            {/* End Form Element */}
          </div>
          {/* End Form Area */}
        </div>
        {/* End Form Card */}
      </div>
      {/* End Background Container */}
    </>
  );
}

export default BookAuditorium;