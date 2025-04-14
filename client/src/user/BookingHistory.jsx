import React, { useState, useEffect, useCallback } from "react";
import { format, parseISO } from 'date-fns';

// --- Placeholder/Error Icon Components ---
const ImagePlaceholderIcon = () => (
  <div className="text-center px-2 flex flex-col items-center justify-center h-full">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto mb-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
    <span className="text-xs font-medium block">No Poster</span>
  </div>
);

const ImageErrorIcon = () => (
  <div className="text-center p-2 flex flex-col items-center justify-center h-full">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span className="text-xs font-medium text-red-600">Load Error</span>
  </div>
);

// Fallback image URL for img onError
const ERROR_IMAGE_URL = "https://via.placeholder.com/150/FFEBEE/D32F2F?text=Load+Error";

// --- Main Component ---

function BookingHistory() {
  // --- State Definitions ---

  // Data State
  const [bookings, setBookings] = useState([]); // Original list from API
  const [filteredBookings, setFilteredBookings] = useState([]); // Displayed list after filters
  const [departments, setDepartments] = useState([]); // For filter dropdown

  // Loading State
  const [isLoading, setIsLoading] = useState(true); // Loading main bookings
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false); // Loading departments
  const [withdrawingId, setWithdrawingId] = useState(null); // Loading state for withdrawal action
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false); // Loading state for modal submission

  // Error State
  const [error, setError] = useState(""); // Main booking fetch error
  const [departmentFetchError, setDepartmentFetchError] = useState(""); // Dept fetch error
  const [actionError, setActionError] = useState(""); // Errors from actions (withdraw/reschedule)
  const [modalError, setModalError] = useState(""); // Error specific to the reschedule modal

  // Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAuditorium, setFilterAuditorium] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterDate, setFilterDate] = useState("");

  // UI Interaction State
  const [actionSuccess, setActionSuccess] = useState(""); // Success feedback from actions
  const [zoomedImageUrl, setZoomedImageUrl] = useState(null); // URL of image being zoomed
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState(null); // Booking being rescheduled
  const [modalStartTime, setModalStartTime] = useState(""); // New start time in modal
  const [modalEndTime, setModalEndTime] = useState(""); // New end time in modal
  // const [modalReason, setModalReason] = useState(""); // Reason field removed based on code

  // --- Constants ---
  const bookingLeadTimeHours = 2; // Lead time (in hours) required before an event starts for actions like withdrawal/reschedule

  // --- Helper Functions ---

  /** Sets temporary feedback message and clears it after a duration. */
  const showTemporaryFeedback = (setter, message, duration = 5000) => {
    setter(message);
    const timer = setTimeout(() => setter(""), duration);
    return () => clearTimeout(timer); // Return cleanup function
  };

  /** Formats an ISO date string for datetime-local input. */
  const formatDateTimeForInput = (isoString) => {
    if (!isoString) return "";
    try {
      // Use Date object directly for compatibility with datetime-local format
      const dt = new Date(isoString);
      // Adjust for local timezone offset before formatting
      const localDt = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000);
      // Format to YYYY-MM-DDTHH:mm
      return localDt.toISOString().slice(0, 16);
    } catch (e) {
      console.error("Error formatting date for input:", e);
      return "";
    }
  };

  /** Calculates the minimum allowed datetime string for reschedule input. */
  const getMinDateTimeLocalString = () => {
    try {
      const now = new Date();
      // Calculate minimum allowed time (now + lead time)
      const minDate = new Date(now.getTime() + (bookingLeadTimeHours || 2) * 60 * 60 * 1000);
      // Adjust for local timezone offset before formatting
      const localMinDt = new Date(minDate.getTime() - minDate.getTimezoneOffset() * 60000);
      // Format to YYYY-MM-DDTHH:mm
      return localMinDt.toISOString().slice(0, 16);
    } catch (e) {
      console.error("Error calculating min datetime:", e);
      // Fallback to current time if calculation fails
      const now = new Date();
      const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
      return localNow.toISOString().slice(0, 16);
    }
  };

  // --- Data Fetching Callbacks ---

  /** Fetches the current user's bookings. */
  const fetchMyBookings = useCallback(async () => {
    setIsLoading(true);
    setError("");
    setActionError(""); // Clear feedback on refresh
    setActionSuccess("");
    const token = localStorage.getItem('authToken');

    if (!token) {
      setError("Authentication Error. Please log in.");
      setIsLoading(false);
      return;
    }

    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/bookings/mybookings`;
    console.log("[API Call] Fetching user bookings:", url);

    try {
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Accept": "application/json"
        }
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        const txt = await response.text();
        throw new Error(`Server returned non-JSON response (${response.status}): ${txt.substring(0, 150)}...`);
      }

      if (!response.ok) {
        throw new Error(data.message || `Failed to fetch bookings (Status ${response.status})`);
      }

      if (data.success && Array.isArray(data.data)) {
        // Process bookings: ensure 'id' and handle missing department
        const processedBookings = data.data.map(b => ({
          ...b,
          id: b._id,
          department: b.department || { _id: null, name: 'N/A (Missing)' }
        }));
        setBookings(processedBookings);
        console.log("[API Response] User bookings received:", processedBookings.length);
      } else {
        throw new Error(data.message || "Received invalid data format for bookings.");
      }
    } catch (e) {
      console.error("[Error] Fetch user bookings failed:", e);
      setError(e.message || "Could not load your booking history.");
      setBookings([]); // Clear data on error
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies

  /** Fetches the list of departments for filtering. */
  const fetchDepartments = useCallback(async () => {
    setIsLoadingDepartments(true);
    setDepartmentFetchError("");
    const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/departments`;
    console.log("[API Call] Fetching departments:", apiUrl);

    try {
      // Assuming public endpoint, add Auth header if needed
      const response = await fetch(apiUrl, { headers: { 'Accept': 'application/json' } });
      if (!response.ok) {
        let errorMsg = `Department list fetch failed (${response.status})`;
        try {
          const data = await response.json();
          errorMsg = data.message || errorMsg;
        } catch (e) { /* ignore parse error */ }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setDepartments(data.data);
      } else {
        throw new Error(data.message || "Received invalid data format for departments.");
      }
    } catch (err) {
      console.error("[Error] Fetch departments failed:", err);
      setDepartmentFetchError(err.message || "Could not load department list.");
      setDepartments([]);
    } finally {
      setIsLoadingDepartments(false);
    }
  }, []); // No dependencies

  // --- Effect Hooks ---

  // Fetch initial data on mount
  useEffect(() => {
    fetchMyBookings();
    fetchDepartments();
  }, [fetchMyBookings, fetchDepartments]); // Depend on stable callbacks

  // Apply filters whenever booking list or filter criteria change
  useEffect(() => {
    const filtered = bookings.filter(b => {
      const lowerSearchTerm = searchTerm.toLowerCase();

      // Search match (event name or description)
      const searchMatch = !searchTerm ||
        (b.eventName?.toLowerCase().includes(lowerSearchTerm)) ||
        (b.description?.toLowerCase().includes(lowerSearchTerm));

      // Status match
      const statusMatch = filterStatus === "all" || b.status === filterStatus;

      // Auditorium match (by name)
      const auditoriumMatch = filterAuditorium === "all" || b.auditorium?.name === filterAuditorium;

      // Department match (by ID)
      const departmentMatch = filterDepartment === "all" || b.department?._id === filterDepartment;

      // Date match (event starts on this date)
      const dateMatch = !filterDate || (b.startTime && format(parseISO(b.startTime), 'yyyy-MM-dd') === filterDate);

      return searchMatch && statusMatch && auditoriumMatch && departmentMatch && dateMatch;
    });
    setFilteredBookings(filtered);
  }, [bookings, searchTerm, filterStatus, filterAuditorium, filterDepartment, filterDate]); // Re-filter on change

  // --- Action Handlers ---

  /** Withdraws a booking request. */
  const handleWithdraw = async (bookingId) => {
    if (withdrawingId || isSubmittingReschedule) return; // Prevent overlapping actions

    if (!window.confirm("Are you sure you want to withdraw this booking request? This action cannot be undone.")) {
      return;
    }

    setActionError("");
    setActionSuccess("");
    setWithdrawingId(bookingId); // Set loading state for withdrawal

    const token = localStorage.getItem('authToken');
    if (!token) {
      showTemporaryFeedback(setActionError, "Authentication Error. Please log in again.");
      setWithdrawingId(null);
      return;
    }

    // Use DELETE method on the specific booking endpoint
    const url = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/bookings/${bookingId}`;
    console.log(`[API Call] Withdrawing booking ${bookingId} (DELETE ${url})`);

    try {
      const response = await fetch(url, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}`, "Accept": "application/json" }
      });

      const data = await response.json(); // Assume backend sends JSON response

      if (!response.ok) {
        throw new Error(data.message || `Withdrawal failed (Status ${response.status})`);
      }

      showTemporaryFeedback(setActionSuccess, data.message || "Booking withdrawn successfully!");
      // Update state by removing the withdrawn booking
      setBookings(prevBookings => prevBookings.filter(b => b._id !== bookingId));

    } catch (e) {
      console.error(`[Error] Withdraw booking ${bookingId} failed:`, e);
      showTemporaryFeedback(setActionError, e.message || "Failed to withdraw booking.");
    } finally {
      setWithdrawingId(null); // Clear loading state
    }
  };

  // --- Reschedule Modal Handlers ---

  /** Opens the reschedule modal with details of the selected booking. */
  const openRescheduleModal = (bookingId) => {
    if (withdrawingId || isSubmittingReschedule) return; // Prevent opening if other actions are busy

    const bookingToReschedule = bookings.find(b => b._id === bookingId);

    // Validations before opening modal
    if (!bookingToReschedule) {
      showTemporaryFeedback(setActionError, "Could not find the booking to reschedule.");
      return;
    }
    if (bookingToReschedule.status !== 'approved') {
      showTemporaryFeedback(setActionError, "Only 'Approved' bookings can be rescheduled.");
      return;
    }
    const eventStartTime = bookingToReschedule.startTime ? parseISO(bookingToReschedule.startTime) : null;
    if (!eventStartTime || eventStartTime <= new Date()) {
      // Prevent rescheduling past or currently ongoing events
      showTemporaryFeedback(setActionError, "Cannot reschedule past or ongoing events.");
      return;
    }

    // Set state to open the modal
    setRescheduleBooking(bookingToReschedule);
    setModalStartTime(formatDateTimeForInput(bookingToReschedule.startTime));
    setModalEndTime(formatDateTimeForInput(bookingToReschedule.endTime));
    // setModalReason(""); // Reason field removed
    setModalError(""); // Clear previous modal errors
    setActionError(""); // Clear page-level errors
    setActionSuccess("");
    setIsRescheduleModalOpen(true);
  };

  /** Closes the reschedule modal and resets its state. */
  const closeRescheduleModal = () => {
    setIsRescheduleModalOpen(false);
    // Delay resetting state until after fade-out animation (if any)
    setTimeout(() => {
      setRescheduleBooking(null);
      // setModalReason("");
      setModalStartTime("");
      setModalEndTime("");
      setModalError("");
    }, 300); // Adjust timeout based on animation duration
  };

  /** Handles the submission of the reschedule request from the modal. */
  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!rescheduleBooking) return;

    setModalError("");
    setIsSubmittingReschedule(true);
    let startISO, endISO;

    // 1. Frontend Validation within Modal
    try {
      if (!modalStartTime || !modalEndTime) {
        throw new Error("New start and end times are required.");
      }
      const startDateTime = new Date(modalStartTime);
      const endDateTime = new Date(modalEndTime);

      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        throw new Error("Invalid date/time format entered.");
      }
      if (startDateTime >= endDateTime) {
        throw new Error("New end time must be strictly after the new start time.");
      }
      // Check lead time requirement against current time
      const now = new Date();
      const leadTimeCheck = bookingLeadTimeHours || 2;
      if (startDateTime < new Date(now.getTime() + leadTimeCheck * 60 * 60 * 1000)) {
        throw new Error(`New start time must be at least ${leadTimeCheck} hours from now.`);
      }
      // Check if times actually changed
      if (formatDateTimeForInput(rescheduleBooking.startTime) === modalStartTime &&
        formatDateTimeForInput(rescheduleBooking.endTime) === modalEndTime) {
        throw new Error("New times are the same as the current booking times.");
      }

      // Convert valid dates to ISO strings for API
      startISO = startDateTime.toISOString();
      endISO = endDateTime.toISOString();

    } catch (validationError) {
      setModalError(validationError.message);
      setIsSubmittingReschedule(false);
      return;
    }

    // 2. Authentication Check
    const token = localStorage.getItem('authToken');
    if (!token) {
      setModalError("Authentication Error. Please log in again.");
      setIsSubmittingReschedule(false);
      return;
    }

    // 3. API Call (PUT request to update booking)
    // Use the specific booking endpoint, not the general /api/bookings
    const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/bookings/${rescheduleBooking._id}`;
    console.log(`[API Call] Requesting reschedule for ${rescheduleBooking._id} (PUT ${apiUrl})`);

    try {
      const response = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        // Send *only* the new times in the body (backend handles the rest)
        body: JSON.stringify({ newStartTime: startISO, newEndTime: endISO }),
      });

      let data;
      const contentType = response.headers.get("content-type");
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`Server returned non-JSON response (${response.status}): ${text.substring(0, 150)}...`);
      }

      if (!response.ok) {
        throw new Error(data.message || `Reschedule request failed (Status ${response.status})`);
      }

      // 4. Success Handling
      showTemporaryFeedback(setActionSuccess, data.message || "Reschedule request submitted! Status is now 'Pending'.", 7000);
      // Update the booking in the local state immediately
      setBookings(prev => prev.map(b =>
        (b._id === rescheduleBooking._id ? { ...data.data, id: data.data._id } : b)
      ));
      closeRescheduleModal(); // Close modal on success

    } catch (err) {
      console.error(`[Error] Reschedule API request failed:`, err);
      setModalError(err.message || "An error occurred while submitting the reschedule request.");
    } finally {
      setIsSubmittingReschedule(false); // Clear loading state
    }
  };


  // --- Render Component UI ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative">
        <h1 className="text-3xl sm:text-4xl font-bold text-center text-red-800 mb-8 tracking-tight">
          My Booking History
        </h1>

        {/* Page-Level Feedback Area */}
        {actionError && (
          <div className="mb-6 p-3 text-center text-sm font-medium text-red-800 bg-red-100 rounded-md border border-red-200 shadow-sm" role="alert">
            {actionError}
          </div>
        )}
        {actionSuccess && (
          <div className="mb-6 p-3 text-center text-sm font-medium text-green-800 bg-green-100 rounded-md border border-green-200 shadow-sm" role="alert">
            {actionSuccess}
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="text-center py-16">
            <p className="text-lg text-gray-500 animate-pulse">Loading booking history...</p>
          </div>
        )}

        {/* Error Message */}
        {error && !isLoading && (
          <div className="my-8 p-4 text-center text-red-800 bg-red-100 rounded-lg border border-red-200 shadow">
            <p><strong>Error:</strong> {error}</p>
            <button
              onClick={fetchMyBookings}
              className="mt-2 px-3 py-1 text-sm font-medium rounded bg-red-600 text-white hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Content Area (Filters + List) */}
        {!isLoading && !error && (
          <>
            {/* --- Filter Bar --- */}
            <div className="mb-8 p-3 sm:p-4 bg-white rounded-lg shadow-md sticky top-4 z-20 backdrop-blur-sm bg-opacity-95 border border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 items-center">
                {/* Search */}
                <input
                  type="text"
                  placeholder="🔍 Search Event..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="p-2 px-3 rounded-md border border-gray-300 shadow-sm w-full text-sm focus:ring-red-500 focus:border-red-500 transition"
                  aria-label="Search by event name or description"
                />
                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="p-2 px-3 rounded-md border border-gray-300 shadow-sm w-full text-sm focus:ring-red-500 focus:border-red-500 transition"
                  aria-label="Filter by status"
                >
                  <option value="all">All Status</option>
                  <option value="approved">Approved</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
                {/* Auditorium Filter */}
                <select
                  value={filterAuditorium}
                  onChange={(e) => setFilterAuditorium(e.target.value)}
                  className="p-2 px-3 rounded-md border border-gray-300 shadow-sm w-full text-sm focus:ring-red-500 focus:border-red-500 transition"
                  aria-label="Filter by auditorium"
                >
                  <option value="all">All Auditoriums</option>
                  {[...new Set(bookings.map(b => b.auditorium?.name).filter(Boolean))]
                    .sort()
                    .map((name, i) => (<option key={i} value={name}>{name}</option>))
                  }
                </select>
                {/* Department Filter */}
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="p-2 px-3 rounded-md border border-gray-300 shadow-sm w-full text-sm focus:ring-red-500 focus:border-red-500 transition disabled:bg-gray-100 disabled:cursor-not-allowed"
                  aria-label="Filter by department"
                  disabled={isLoadingDepartments || !!departmentFetchError || departments.length === 0}
                >
                  <option value="all">All Departments</option>
                  {departmentFetchError ? (<option disabled>Error</option>
                  ) : isLoadingDepartments ? (<option disabled>Loading...</option>
                  ) : (
                    departments.map((dept) => (
                      <option key={dept._id} value={dept._id}>
                        {dept.name} {dept.code ? `(${dept.code})` : ''}
                      </option>
                    ))
                  )}
                </select>
                {/* Date Filter */}
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="p-2 px-3 rounded-md border border-gray-300 shadow-sm w-full text-sm focus:ring-red-500 focus:border-red-500 transition"
                  aria-label="Filter by start date"
                />
              </div>
              {/* Department Filter Error */}
              {departmentFetchError && <p className="text-xs text-red-500 mt-2">Dept filter error: {departmentFetchError}</p>}
            </div>
            {/* --- End Filter Bar --- */}

            {/* --- Booking List / No Results Message --- */}
            {filteredBookings.length === 0 ? (
              <div className="text-center py-16">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {bookings.length === 0 ? "No bookings found" : "No bookings match filters"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {bookings.length === 0 ? "You haven't made any booking requests yet." : "Try adjusting your search or filter criteria."}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredBookings.map((booking) => {
                  // Calculate permissions/dates
                  const eventStart = booking.startTime ? parseISO(booking.startTime) : null;
                  const now = new Date();
                  const withdrawAllowed = booking.status === "pending" || (
                    booking.status === "approved" && eventStart && eventStart > new Date(now.getTime() + (bookingLeadTimeHours || 2) * 60 * 60 * 1000)
                  );
                  const rescheduleAllowed = booking.status === "approved" && eventStart && eventStart > now;

                  // Image details
                  const imagePath = booking.eventImages?.[0];
                  const fullImageUrl = imagePath ? `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${imagePath}` : null;

                  // Action button disabling logic
                  const isAnyActionInProgress = !!(withdrawingId || isSubmittingReschedule);
                  const isThisWithdrawInProgress = withdrawingId === booking._id;

                  return (
                    <div key={booking._id} className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6 overflow-hidden hover:shadow-md transition-shadow duration-200">
                      <div className="flex flex-col md:flex-row gap-5 items-start">
                        {/* Image Area */}
                        <div
                          className={`flex-shrink-0 w-full md:w-44 h-44 rounded-lg shadow bg-gray-100 flex items-center justify-center overflow-hidden text-gray-400 relative ${fullImageUrl ? "cursor-pointer hover:opacity-90 transition-opacity" : ""}`}
                          onClick={() => fullImageUrl && setZoomedImageUrl(fullImageUrl)}
                          title={fullImageUrl ? "Click to zoom poster" : "No poster available"}
                        >
                          {fullImageUrl ? (
                            <img
                              src={fullImageUrl}
                              alt={`${booking.eventName || "Event"} Poster`}
                              className="w-full h-full object-cover"
                              // Simple onError to fallback to a placeholder URL
                              onError={(e) => {
                                if (e.target.src !== ERROR_IMAGE_URL) {
                                  e.target.onerror = null; // prevent infinite loop if error URL also fails
                                  e.target.src = ERROR_IMAGE_URL;
                                }
                              }}
                              loading="lazy"
                            />
                          ) : (
                            <ImagePlaceholderIcon />
                          )}
                        </div>

                        {/* Details Area */}
                        <div className="flex-1 min-w-0 space-y-2.5">
                          {/* Header: Event Name & Status */}
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-1">
                            <h2 className="text-xl font-semibold text-gray-800 truncate pr-2" title={booking.eventName}>
                              {booking.eventName || <span className="italic text-gray-400">Untitled Event</span>}
                            </h2>
                            <span className={`flex-shrink-0 mt-1 sm:mt-0 px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${booking.status === "approved" ? "bg-green-100 text-green-800 border-green-200" : booking.status === "pending" ? "bg-yellow-100 text-yellow-800 border-yellow-200" : booking.status === "rejected" ? "bg-red-100 text-red-800 border-red-200" : "bg-gray-100 text-gray-800 border-gray-200"}`}>
                              {booking.status?.toUpperCase() || "N/A"}
                            </span>
                          </div>

                          {/* Description */}
                          <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                            {booking.description || <span className="italic text-gray-400">No description provided.</span>}
                          </p>

                          {/* Info List */}
                          <div className="text-xs sm:text-sm text-gray-500 space-y-1.5 border-t border-gray-100 pt-2.5 mt-2.5">
                            <p>
                              <strong className="font-medium text-gray-700 w-20 inline-block">When:</strong>
                              {booking.startTime ? format(parseISO(booking.startTime), 'MMM d, yyyy, h:mm a') : "N/A"}
                              {" - "}
                              {booking.endTime ? format(parseISO(booking.endTime), 'h:mm a') : "N/A"}
                            </p>
                            <p>
                              <strong className="font-medium text-gray-700 w-20 inline-block">Where:</strong>
                              {booking.auditorium?.name ?? <span className="italic">N/A</span>}
                              {booking.auditorium?.location && ` (${booking.auditorium.location})`}
                            </p>
                            <p>
                              <strong className="font-medium text-gray-700 w-20 inline-block">Dept:</strong>
                              {booking.department?.name ?? <span className="italic">N/A</span>}
                              {booking.department?.code && ` (${booking.department.code})`}
                            </p>
                            {/* Rejection Reason */}
                            {booking.status === "rejected" && booking.rejectionReason && (
                              <blockquote className="mt-2 pl-3 border-l-4 border-red-300 bg-red-50 text-red-800 text-xs italic py-1">
                                <strong className="not-italic font-medium text-red-900">Reason:</strong> {booking.rejectionReason}
                              </blockquote>
                            )}
                          </div>

                          {/* Action Buttons Area */}
                          {(withdrawAllowed || rescheduleAllowed) && (
                            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100 mt-3">
                              {/* Withdraw Button */}
                              {withdrawAllowed && (
                                <button
                                  onClick={() => handleWithdraw(booking._id)}
                                  className="px-3 py-1.5 text-xs font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                  disabled={isAnyActionInProgress || isThisWithdrawInProgress} // Disable if any action or specifically this withdraw is running
                                >
                                  {isThisWithdrawInProgress ? (
                                    <>
                                      <svg className="animate-spin -ml-0.5 mr-1.5 h-3 w-3 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                      Withdrawing...
                                    </>
                                  ) : (
                                    "Withdraw Request"
                                  )}
                                </button>
                              )}
                              {/* Reschedule Button */}
                              {rescheduleAllowed && (
                                <button
                                  onClick={() => openRescheduleModal(booking._id)}
                                  disabled={isAnyActionInProgress} // Disable if any action is running
                                  className="px-3 py-1.5 text-xs font-medium rounded-md shadow-sm text-gray-700 bg-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                                  Request Reschedule
                                </button>
                              )}
                            </div>
                          )}
                          {/* End Action Buttons Area */}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {/* --- End Booking List / No Results --- */}
          </>
        )} {/* End Content Area */}

        {/* --- Reschedule Modal --- */}
        {isRescheduleModalOpen && rescheduleBooking && (
          <div
            className="fixed inset-0 z-40 bg-black bg-opacity-70 flex items-center justify-center p-4 animate-fade-in-fast backdrop-blur-sm"
            onClick={closeRescheduleModal} // Close on backdrop click
          >
            <div
              className="relative bg-white w-full max-w-lg rounded-lg shadow-xl p-6 m-4 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-5">
                <h2 className="text-xl font-semibold text-gray-800">Request Reschedule</h2>
                <button
                  onClick={closeRescheduleModal}
                  className="text-gray-400 hover:text-gray-700 p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500"
                  aria-label="Close Reschedule Modal"
                >
                  {/* Close Icon (X) */}
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}> <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> </svg>
                </button>
              </div>

              {/* Modal Body (Form) */}
              <form onSubmit={handleModalSubmit} className="space-y-4">
                {/* Booking Info Display */}
                <div className="text-sm p-3 bg-gray-50 rounded border border-gray-200">
                  <p><strong>Event:</strong> {rescheduleBooking.eventName}</p>
                  <p><strong>Auditorium:</strong> {rescheduleBooking.auditorium?.name ?? 'N/A'}</p>
                  <p className="mt-2">
                    <strong>Current Start:</strong> {formatDateTimeForInput(rescheduleBooking.startTime) ? format(parseISO(rescheduleBooking.startTime), 'PPpp') : 'N/A'}
                  </p>
                  <p>
                    <strong>Current End:</strong> {formatDateTimeForInput(rescheduleBooking.endTime) ? format(parseISO(rescheduleBooking.endTime), 'PPpp') : 'N/A'}
                  </p>
                </div>

                {/* New Start Time Input */}
                <div>
                  <label htmlFor="modalStartTime" className="block text-sm font-medium text-gray-700 mb-1">
                    New Start Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="modalStartTime"
                    type="datetime-local"
                    value={modalStartTime}
                    onChange={(e) => setModalStartTime(e.target.value)}
                    required
                    disabled={isSubmittingReschedule}
                    min={getMinDateTimeLocalString()} // Prevent selecting past dates/times
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* New End Time Input */}
                <div>
                  <label htmlFor="modalEndTime" className="block text-sm font-medium text-gray-700 mb-1">
                    New End Time <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="modalEndTime"
                    type="datetime-local"
                    value={modalEndTime}
                    onChange={(e) => setModalEndTime(e.target.value)}
                    required
                    disabled={isSubmittingReschedule}
                    min={modalStartTime || getMinDateTimeLocalString()} // End must be >= start
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Modal Error Display */}
                {modalError && (
                  <p className="text-sm text-red-600 text-center p-2 bg-red-50 rounded border border-red-200">
                    {modalError}
                  </p>
                )}

                {/* Modal Footer (Actions) */}
                <div className="flex justify-end items-center gap-3 pt-4 border-t border-gray-200 mt-6">
                  <button
                    type="button" // Prevent form submission
                    onClick={closeRescheduleModal}
                    disabled={isSubmittingReschedule}
                    className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-400 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReschedule || !modalStartTime || !modalEndTime} // Disable if submitting or times empty
                    className="px-5 py-2 text-sm font-semibold rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmittingReschedule ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        Submitting...
                      </>
                    ) : (
                      "Submit Reschedule Request"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* --- End Reschedule Modal --- */}

        {/* --- Image Zoom Modal --- */}
        {zoomedImageUrl && (
          <div
            className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center p-4 animate-fade-in-fast"
            onClick={() => setZoomedImageUrl(null)} // Close on backdrop click
          >
            <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-xl overflow-hidden">
              <img
                src={zoomedImageUrl}
                alt="Zoomed Poster"
                className="block max-w-full max-h-[90vh] object-contain mx-auto my-auto"
                onClick={(e) => e.stopPropagation()} // Prevent closing on image click
              />
              <button
                onClick={() => setZoomedImageUrl(null)}
                className="absolute top-2 right-2 bg-white bg-opacity-70 hover:bg-opacity-100 text-gray-900 rounded-full p-1 leading-none focus:outline-none focus:ring-2 focus:ring-offset-white focus:ring-red-500 transition"
                aria-label="Close zoom"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        {/* --- End Image Zoom Modal --- */}
      </div> {/* End Page Container */}
    </div> // End Main Div
  );
}

export default BookingHistory;