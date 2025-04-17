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

const ImageErrorPlaceholder = () => (
  <div className="text-center p-2 flex flex-col items-center justify-center h-full">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <span className="text-xs font-medium text-red-600">Load Error</span>
  </div>
);

// Not used directly, but good practice if you have an error fallback URL
// const ERROR_IMAGE_URL = "https://via.placeholder.com/150/FFEBEE/D32F2F?text=Load+Error";
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// --- Main Component ---

const ManageBookings = () => {
  // --- State Definitions ---

  // Data State
  const [allBookings, setAllBookings] = useState([]); // Original full list from API
  const [filteredBookings, setFilteredBookings] = useState([]); // List after filtering
  const [departments, setDepartments] = useState([]); // Department Data for Filter

  // Loading State
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);

  // Error State
  const [fetchError, setFetchError] = useState("");
  const [departmentFetchError, setDepartmentFetchError] = useState("");
  const [actionError, setActionError] = useState("");
  const [imgErrors, setImgErrors] = useState({}); // Key: bookingId, Value: boolean

  // Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAuditorium, setFilterAuditorium] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterDate, setFilterDate] = useState("");

  // UI Interaction State
  const [rejectingBookingId, setRejectingBookingId] = useState(null); // Which booking's reject input is open
  const [rejectReasons, setRejectReasons] = useState({}); // Key: bookingId, Value: reason text
  const [approvingId, setApprovingId] = useState(null); // ID of booking being approved
  const [rejectingId, setRejectingId] = useState(null); // ID of booking being rejected (confirm step)
  const [actionSuccess, setActionSuccess] = useState("");
  const [zoomedImageUrl, setZoomedImageUrl] = useState(null);

  // --- Helpers ---
  /** Sets temporary feedback message and clears it after a duration. */
  const showTemporaryFeedback = (setter, message, duration = 5000) => {
    setter(message);
    const timer = setTimeout(() => setter(""), duration);
    return () => clearTimeout(timer); // Return cleanup function
  };

  // --- API Fetch Callbacks ---

  /** Fetches all bookings using the admin endpoint. */
  const fetchAllBookings = useCallback(async () => {
    setIsLoading(true);
    setFetchError("");
    setActionError(""); // Clear action feedback on refresh
    setActionSuccess("");
    const token = localStorage.getItem("authToken");
    const userRole = localStorage.getItem("userRole");

    if (!token || userRole !== "admin") {
      setFetchError("Access Denied: Admin privileges required.");
      setIsLoading(false);
      return;
    }

    const apiUrl = `${API_BASE_URL}/api/bookings/admin/all`;
    console.log("[API Call] Fetching ALL bookings (Admin):", apiUrl);

    try {
      const response = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      let data;
      const contentType = response.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        data = await response.json();
      } else {
        const txt = await response.text();
        throw new Error(`Server Error ${response.status}: ${txt.substring(0, 150)}...`);
      }

      if (!response.ok) {
        throw new Error(data.message || `Failed to fetch bookings (Status ${response.status})`);
      }

      if (data.success && Array.isArray(data.data)) {
        // Process bookings: ensure department object exists, add id
        const processedBookings = data.data.map((b) => ({
          ...b,
          id: b._id, // Ensure 'id' field for potential key usage later
          // Handle potentially missing nested data gracefully
          department: b.department || { _id: null, name: 'N/A (Missing)' },
          user: b.user || { _id: null, username: 'N/A', email: 'N/A' }, // Graceful handle missing user
          auditorium: b.auditorium || { _id: null, name: 'N/A' } // Graceful handle missing auditorium
        }));
        setAllBookings(processedBookings);
        console.log("[API Response] All bookings received:", processedBookings.length);
      } else {
        throw new Error(data.message || "Received invalid data format for bookings.");
      }
    } catch (e) {
      console.error("[Error] Fetch all bookings err:", e);
      setFetchError(e.message || "Could not load booking requests.");
      setAllBookings([]); // Clear data on error
    } finally {
      setIsLoading(false);
    }
  }, []); // No dependencies, fetch logic is self-contained

  /** Fetches the list of departments for the filter dropdown. */
  const fetchDepartments = useCallback(async () => {
    setIsLoadingDepartments(true);
    setDepartmentFetchError("");
    const apiUrl = `${API_BASE_URL}/api/departments`;
    console.log("[API Call] Fetching departments for filter (Admin):", apiUrl);
    // Assuming departments are public or using the same admin token logic if needed
    // const token = localStorage.getItem("authToken");

    try {
      const response = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json'
          // Authorization: `Bearer ${token}` // Add if endpoint is protected
        }
      });

      if (!response.ok) {
        let errorMsg = `Department list fetch failed (${response.status})`;
        try {
          const data = await response.json();
          errorMsg = data.message || errorMsg;
        } catch (e) { /* ignore JSON parsing error if response wasn't JSON */ }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        setDepartments(data.data);
        console.log("[API Response] Departments loaded (Admin):", data.data.length);
      } else {
        throw new Error(data.message || "Received invalid data format for departments.");
      }
    } catch (err) {
      console.error("[Error] Fetch departments failed (Admin):", err);
      setDepartmentFetchError(err.message || "Could not load department list for filter.");
      setDepartments([]);
    } finally {
      setIsLoadingDepartments(false);
    }
  }, []); // No dependencies

  // --- Effect Hooks ---

  // Initial data fetch on component mount
  useEffect(() => {
    fetchAllBookings();
    fetchDepartments();
  }, [fetchAllBookings, fetchDepartments]); // Dependencies are the stable callback functions

  // Filtering logic - runs when data or filter criteria change
  useEffect(() => {
    console.log("[Filtering Admin] Applying filters...", { searchTerm, filterStatus, filterAuditorium, filterDepartment, filterDate });

    const filtered = allBookings.filter((b) => {
      const lowerSearch = searchTerm.toLowerCase();

      // Search Match (Event Name, User Email, or User Name)
      const searchMatch = !searchTerm ||
        (b.eventName?.toLowerCase().includes(lowerSearch)) ||
        (b.user?.email?.toLowerCase().includes(lowerSearch)) ||
        (b.user?.username?.toLowerCase().includes(lowerSearch));

      // Status Match
      const statusMatch = filterStatus === "all" || b.status === filterStatus;

      // Auditorium Match (Uses name from filter dropdown)
      const auditoriumName = b.auditorium?.name ?? ""; // Handle potential missing data
      const auditoriumMatch = filterAuditorium === "all" || auditoriumName === filterAuditorium;

      // Department Match (Uses ID from filter dropdown)
      const departmentMatch = filterDepartment === "all" || b.department?._id === filterDepartment;

      // Date Match (Event starts on this specific date)
      const dateMatch = !filterDate || (b.startTime && format(parseISO(b.startTime), 'yyyy-MM-dd') === filterDate);

      return searchMatch && statusMatch && auditoriumMatch && departmentMatch && dateMatch;
    });

    setFilteredBookings(filtered);
    console.log("[Filtering Admin] Filter results:", filtered.length);
  }, [allBookings, searchTerm, filterStatus, filterAuditorium, filterDepartment, filterDate]); // Re-run when these change


  // --- UI Interaction Handlers ---

  /** Toggles the display of the rejection reason input for a booking. */
  const handleRejectClick = (bookingId) => {
    if (approvingId || rejectingId) return; // Don't open if another action is busy

    setRejectingBookingId((prev) => (prev === bookingId ? null : bookingId));
    // Reset reason only when opening the input for a *different* booking
    if (rejectingBookingId !== bookingId) {
      setRejectReasons((prev) => ({ ...prev, [bookingId]: "" }));
    }
  };

  /** Updates the rejection reason state for a specific booking. */
  const handleReasonChange = (bookingId, value) => {
    setRejectReasons((prev) => ({ ...prev, [bookingId]: value }));
  };

  /** Handles image loading errors for specific bookings. */
  const handleImageError = useCallback((bookingId) => {
    console.warn(`Image load error detected for booking ID: ${bookingId}`);
    setImgErrors((prev) => ({ ...prev, [bookingId]: true }));
  }, []); // Stable callback

  // --- Action Handlers (API Calls) ---

  /** Approves a booking. */
  const handleApprove = async (bookingId) => {
    if (approvingId || rejectingId) return; // Prevent overlapping actions

    setActionError("");
    setActionSuccess("");
    setApprovingId(bookingId); // Set loading state for this approval

    const token = localStorage.getItem("authToken");
    if (!token) {
      showTemporaryFeedback(setActionError, "Authentication Error: Please log in again.");
      setApprovingId(null);
      return;
    }

    const url = `${API_BASE_URL}/api/bookings/${bookingId}/approve`;
    console.log(`[API Call] Approving booking ${bookingId} (PUT ${url})`);

    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      const data = await response.json(); // Assume JSON response for errors too

      if (!response.ok) {
        throw new Error(data.message || `Approval failed (Status ${response.status})`);
      }

      showTemporaryFeedback(setActionSuccess, data.message || `Booking Approved!`);

      // Update local state to reflect the change immediately
      // Backend should return the updated booking in data.data
      // Ensure all nested objects are preserved or updated
      setAllBookings((prev) =>
        prev.map((b) =>
          b._id === bookingId
            ? { ...b, // Keep existing non-updated fields
                ...data.data, // Apply updates from backend response
                id: data.data._id, // Ensure ID is present
                department: data.data.department || b.department, // Preserve if backend doesn't return it fully
                user: data.data.user || b.user,
                auditorium: data.data.auditorium || b.auditorium,
              }
            : b // Keep other bookings unchanged
        )
      );


      // Close reject input if it was open for this booking
      if (rejectingBookingId === bookingId) {
        setRejectingBookingId(null);
      }

    } catch (e) {
      console.error(`[Error] Approve booking ${bookingId} failed:`, e);
      showTemporaryFeedback(setActionError, e.message || "Approve action failed.");
    } finally {
      setApprovingId(null); // Clear loading state regardless of outcome
    }
  };

  /** Confirms and submits the rejection of a booking with a reason. */
  const handleConfirmReject = async (bookingId) => {
    if (approvingId || rejectingId) return; // Prevent overlap

    const reason = rejectReasons[bookingId]?.trim();
    if (!reason) {
      showTemporaryFeedback(setActionError, "Rejection reason is required.");
      // Keep the input open and focus it for correction
      document.getElementById(`rr-${bookingId}`)?.focus();
      return;
    }

    setActionError("");
    setActionSuccess("");
    setRejectingId(bookingId); // Set loading state for this rejection
    setRejectingBookingId(null); // Close the input area visually immediately

    const token = localStorage.getItem("authToken");
    if (!token) {
      showTemporaryFeedback(setActionError, "Authentication Error: Please log in again.");
      setRejectingId(null);
      return;
    }

    const url = `${API_BASE_URL}/api/bookings/${bookingId}/reject`;
    console.log(`[API Call] Rejecting booking ${bookingId} (PUT ${url}) with reason.`);

    try {
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ rejectionReason: reason }), // Send reason in body
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Rejection failed (Status ${response.status})`);
      }

      showTemporaryFeedback(setActionSuccess, data.message || "Booking Rejected.");

      // Update local state using the data returned from the backend
      // Ensure all nested objects are preserved or updated
      setAllBookings((prev) =>
        prev.map((b) =>
          b._id === bookingId
            ? { ...b, // Keep existing non-updated fields
                ...data.data, // Apply updates from backend response
                id: data.data._id, // Ensure ID is present
                department: data.data.department || b.department, // Preserve if backend doesn't return it fully
                user: data.data.user || b.user,
                auditorium: data.data.auditorium || b.auditorium,
              }
            : b // Keep other bookings unchanged
        )
      );

      // Clear the stored reason after successful rejection
      setRejectReasons((prev) => {
        const copy = { ...prev };
        delete copy[bookingId];
        return copy;
      });

    } catch (e) {
      console.error(`[Error] Reject booking ${bookingId} failed:`, e);
      showTemporaryFeedback(setActionError, e.message || "Reject action failed.");
      // Optionally reopen input on failure? Maybe not, let user click reject again.
    } finally {
      setRejectingId(null); // Clear loading state
    }
  };

  // --- Component Render ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative">
        <h1 className="text-3xl sm:text-4xl font-bold text-center text-red-800 mb-8 tracking-tight">
          Manage Booking Requests
        </h1>

        {/* --- Global Feedback Area --- */}
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
        {isLoading && (
          <div className="text-center py-16">
            <p className="text-lg text-gray-500 animate-pulse">Loading booking requests...</p>
            {/* Optional: Add a spinner component here */}
          </div>
        )}
        {fetchError && !isLoading && (
          <div className="mb-8 p-4 text-center text-red-800 bg-red-100 rounded-lg border border-red-200 shadow">
            <p><strong>Error loading requests:</strong> {fetchError}</p>
            <button
              onClick={fetchAllBookings}
              className="mt-2 px-3 py-1 text-sm font-medium rounded bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Retry
            </button>
          </div>
        )}
        {/* --- End Feedback Area --- */}

        {/* Only show filters and list if not initial loading and no initial fetch error */}
        {!isLoading && !fetchError && (
          <>
            {/* --- Filter Bar --- */}
            <div className="mb-8 p-3 sm:p-4 bg-white rounded-lg shadow-md sticky top-4 z-20 backdrop-blur-sm bg-opacity-95 border border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 items-center">
                {/* Search Input */}
                <input
                  type="text"
                  placeholder="🔍 Search Event/User..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="p-2 px-3 rounded-md border border-gray-300 shadow-sm w-full text-sm focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all duration-150 hover:border-red-400"
                  aria-label="Search by event name, user email, or username"
                />
                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="p-2 px-3 rounded-md border border-gray-300 shadow-sm w-full text-sm focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all duration-150 hover:border-red-400 bg-white appearance-none
                             [&>option]:bg-white [&>option]:text-gray-800 [&>option]:p-2
                             [&>option:checked]:font-semibold [&>option:checked]:bg-red-500 [&>option:checked]:text-white" // Attempt styling selected - results vary by browser
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
                  className="p-2 px-3 rounded-md border border-gray-300 shadow-sm w-full text-sm focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all duration-150 hover:border-red-400 bg-white appearance-none
                             [&>option]:bg-white [&>option]:text-gray-800 [&>option]:p-2
                             [&>option:checked]:font-semibold [&>option:checked]:bg-red-500 [&>option:checked]:text-white" // Attempt styling selected
                  aria-label="Filter by auditorium"
                >
                  <option value="all">All Auditoriums</option>
                  {/* Generate options from unique names in the booking data */}
                  {[...new Set(allBookings.map((b) => b.auditorium?.name).filter(Boolean))]
                    .sort() // Sort names alphabetically
                    .map((name, index) => (
                      <option key={index} value={name}>
                        {name}
                      </option>
                    ))}
                </select>
                {/* Department Filter */}
                <select
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                  className="p-2 px-3 rounded-md border border-gray-300 shadow-sm w-full text-sm focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all duration-150 hover:border-red-400 bg-white appearance-none
                             disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-70
                             [&>option]:bg-white [&>option]:text-gray-800 [&>option]:p-2
                             [&>option:checked]:font-semibold [&>option:checked]:bg-red-500 [&>option:checked]:text-white" // Attempt styling selected
                  aria-label="Filter by department"
                  disabled={isLoadingDepartments || !!departmentFetchError || departments.length === 0}
                >
                  <option value="all">All Departments</option>
                  {departmentFetchError ? (
                    <option disabled>Error loading</option>
                  ) : isLoadingDepartments ? (
                    <option disabled>Loading...</option>
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
                  className="p-2 px-3 rounded-md border border-gray-300 shadow-sm w-full text-sm focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all duration-150 hover:border-red-400"
                  aria-label="Filter by event start date"
                />
              </div>
              {/* Department Filter Error Message */}
              {departmentFetchError && (
                <p className="text-xs text-red-500 mt-2">
                  Department filter error: {departmentFetchError}
                </p>
              )}
            </div>
            {/* --- End Filter Bar --- */}

            {/* --- Booking List / No Results Message --- */}
            {filteredBookings.length === 0 ? (
              <div className="text-center py-16">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {allBookings.length === 0 ? "No booking requests found" : "No bookings match filters"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {allBookings.length === 0 ? "There are currently no booking requests." : "Try adjusting your search or filter criteria."}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredBookings.map((booking) => {
                  // Determine image status
                  const imagePath = booking.eventImages?.[0];
                  // Construct URL relative to API base URL if path is relative
                  const fullImageUrl = imagePath
                    ? imagePath.startsWith('http')
                      ? imagePath // Assume absolute URL
                      : `${API_BASE_URL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}` // Construct full URL
                    : null;

                  const imgHasError = imgErrors[booking._id] || false; // Check specific error state

                  // Determine if actions should be disabled
                  const isAnyActionInProgress = !!(approvingId || rejectingId);
                  // Disable buttons for THIS booking if its action is processing
                  const disableActionsForThisBooking = isAnyActionInProgress && (approvingId === booking._id || rejectingId === booking._id);

                  return (
                    <div key={booking._id} className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6 overflow-hidden hover:shadow-md transition-shadow duration-200">
                      <div className="flex flex-col md:flex-row gap-5 items-start">
                        {/* --- Image Area --- */}
                        <div
                          className={`flex-shrink-0 w-full md:w-44 h-44 rounded-lg shadow bg-gray-100 flex items-center justify-center overflow-hidden text-gray-400 relative ${fullImageUrl && !imgHasError ? "cursor-pointer hover:opacity-90 transition-opacity" : ""}`}
                          onClick={() => fullImageUrl && !imgHasError && setZoomedImageUrl(fullImageUrl)}
                          title={fullImageUrl && !imgHasError ? "Click to zoom poster" : "No poster available or error loading"}
                        >
                          {!imgHasError && fullImageUrl ? (
                            <img
                              src={fullImageUrl}
                              alt={`${booking.eventName || "Event"} Poster`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                console.error(`Failed to load image: ${fullImageUrl}`); // Add debug log
                                handleImageError(booking._id);
                              }}
                              loading="lazy" // Improve performance
                            />
                          ) : imgHasError ? (
                            <ImageErrorPlaceholder /> // Show error state
                          ) : (
                            <ImagePlaceholderIcon /> // Show 'no image' state
                          )}
                        </div>
                        {/* --- End Image Area --- */}

                        {/* --- Details Area --- */}
                        <div className="flex-1 min-w-0 space-y-2.5">
                          {/* Header: Event Name & Status */}
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-1">
                            <h2 className="text-xl font-semibold text-gray-800 truncate pr-2" title={booking.eventName}>
                              {booking.eventName || <span className="italic text-gray-400">Untitled Event</span>}
                            </h2>
                            <span
                              className={`flex-shrink-0 mt-1 sm:mt-0 px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${booking.status === "approved" ? "bg-green-100 text-green-800 border-green-200" :
                                booking.status === "pending" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                                  booking.status === "rejected" ? "bg-red-100 text-red-800 border-red-200" :
                                    "bg-gray-100 text-gray-800 border-gray-200" // Default/Fallback
                                }`}
                            >
                              {booking.status?.toUpperCase() || "N/A"}
                            </span>
                          </div>

                          {/* Description */}
                          <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                            {booking.description || <span className="italic text-gray-400">No description provided.</span>}
                          </p>

                          {/* Detailed Info */}
                          <div className="text-xs sm:text-sm text-gray-500 space-y-1.5 border-t border-gray-100 pt-2.5 mt-2.5">
                            <p>
                              <strong className="font-medium text-gray-700 w-20 inline-block">User:</strong>
                              {booking.user?.username ?? booking.user?.email ?? <span className="italic">N/A</span>}
                            </p>
                            <p>
                              <strong className="font-medium text-gray-700 w-20 inline-block">Email:</strong>
                              {booking.user?.email ?? <span className="italic">N/A</span>}
                            </p>
                            <p>
                              <strong className="font-medium text-gray-700 w-20 inline-block">Dept:</strong>
                              {booking.department?.name ?? <span className="italic text-gray-400">N/A</span>}
                              {booking.department?.code && ` (${booking.department.code})`}
                            </p>
                            <p>
                              <strong className="font-medium text-gray-700 w-20 inline-block">Auditorium:</strong>
                              {booking.auditorium?.name ?? <span className="italic">N/A</span>}
                            </p>
                            <p>
                              <strong className="font-medium text-gray-700 w-20 inline-block">From:</strong>
                              {booking.startTime ? format(parseISO(booking.startTime), 'MMM d, yyyy h:mm a') : "N/A"}
                            </p>
                            <p>
                              <strong className="font-medium text-gray-700 w-20 inline-block">To:</strong>
                              {booking.endTime ? format(parseISO(booking.endTime), 'MMM d, yyyy h:mm a') : "N/A"}
                            </p>

                            {/* Rejection Reason (only if rejected) */}
                            {booking.status === "rejected" && booking.rejectionReason && (
                              <div className="mt-2 pl-3 border-l-4 border-red-300 bg-red-50 text-red-800 text-xs italic py-1">
                                <strong className="not-italic font-medium text-red-900">Reason:</strong> {booking.rejectionReason}
                              </div>
                            )}
                          </div>
                          {/* --- End Detailed Info --- */}

                          {/* --- Admin Action Area (only for Pending) --- */}
                          {booking.status === "pending" && (
                            <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                              {rejectingBookingId === booking._id ? (
                                // --- Reject Reason Input Section ---
                                <div className="p-3 bg-red-50 border border-red-200 rounded-md shadow-sm">
                                  <label htmlFor={`rr-${booking._id}`} className="block text-sm font-semibold text-red-800 mb-1.5">
                                    Reason for Rejection <span className="text-red-600">*</span>
                                  </label>
                                  <textarea
                                    id={`rr-${booking._id}`}
                                    className="w-full p-2 border border-red-300 rounded-md text-sm shadow-sm disabled:bg-gray-100 focus:ring-1 focus:ring-red-500 focus:border-red-500 transition"
                                    rows="3"
                                    value={rejectReasons[booking._id] || ""}
                                    onChange={(e) => handleReasonChange(booking._id, e.target.value)}
                                    required
                                    autoFocus // Focus input when opened
                                    disabled={isAnyActionInProgress} // Disable textarea if *any* action is running
                                    aria-describedby={`reason-error-${booking._id}`}
                                  />
                                  <div className="flex justify-end space-x-2 mt-2">
                                    <button
                                      onClick={() => handleConfirmReject(booking._id)}
                                      className="px-3 py-1.5 text-xs font-semibold rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                                      // Disable if reason empty OR this specific reject action is processing OR any other action is processing
                                      disabled={!rejectReasons[booking._id]?.trim() || isAnyActionInProgress || rejectingId === booking._id}
                                    >
                                      {rejectingId === booking._id ? "Rejecting..." : "Confirm Reject"}
                                    </button>
                                    <button
                                      type="button" // Prevent form submission if wrapped in form later
                                      onClick={() => handleRejectClick(booking._id)} // Closes the input
                                      disabled={isAnyActionInProgress} // Only disable if global action happening
                                      className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                                // --- End Reject Input Section ---
                              ) : (
                                // --- Default Approve/Reject Buttons ---
                                <div className="flex flex-wrap items-center gap-3">
                                  <button
                                    onClick={() => handleApprove(booking._id)}
                                    className="px-4 py-2 text-sm font-semibold rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
                                    disabled={isAnyActionInProgress} // Disable if any action is happening
                                  >
                                    {approvingId === booking._id ? (
                                      <>
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Approving...
                                      </>
                                    ) : (
                                      "Approve"
                                    )}
                                  </button>
                                  <button
                                    onClick={() => handleRejectClick(booking._id)}
                                    className="px-4 py-2 text-sm font-semibold rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
                                    disabled={isAnyActionInProgress} // Disable if any action is happening
                                  >
                                    Reject
                                  </button>
                                </div>
                                // --- End Default Buttons ---
                              )}
                            </div>
                          )}
                          {/* --- End Admin Action Area --- */}

                        </div>
                        {/* --- End Details Area --- */}
                      </div>
                    </div>
                  ); // End return for map
                })} {/* End .map() */}
              </div> // End Booking List Container
            )}
            {/* --- End Booking List / No Results --- */}
          </>
        )} {/* End Conditional Render (!isLoading && !fetchError) */}

        {/* --- Image Zoom Modal --- */}
        {zoomedImageUrl && (
          <div
            className="fixed inset-0 z-50 bg-black bg-opacity-80 flex items-center justify-center p-4 animate-fade-in-fast backdrop-blur-sm"
            onClick={() => setZoomedImageUrl(null)} // Close on backdrop click
          >
            <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-xl overflow-hidden">
              {/* Stop propagation on image click to prevent modal closing */}
              <img
                src={zoomedImageUrl}
                alt="Zoomed Poster"
                className="block max-w-full max-h-[90vh] object-contain mx-auto my-auto"
                onClick={(e) => e.stopPropagation()}
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
        {/* --- End Zoom Modal --- */}

      </div> {/* End Page Container */}
    </div> // End Main Div
  );
};

export default ManageBookings;

/* Add this CSS to your global stylesheet or a relevant CSS module */
/* Ensure Tailwind is configured to pick up these classes */
/*
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer utilities {
  .animate-fade-in-fast {
    animation: fadeIn 0.2s ease-out forwards;
  }
}

@keyframes fadeIn {
  from { opacity: 0; backdrop-filter: blur(0); }
  to { opacity: 1; backdrop-filter: blur(4px); } // Example blur for backdrop
}
*/