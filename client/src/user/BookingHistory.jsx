import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom"; // Import useNavigate
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

// Fallback image URL for img onError
const ERROR_IMAGE_URL = "https://via.placeholder.com/150/FFEBEE/D32F2F?text=Load+Error";
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

// --- Debounce Utility Function ---
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => { clearTimeout(timeout); func(...args); };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// --- Main Component ---
function BookingHistory() {
  const modalStartTimeRef = useRef(null);
  const modalEndTimeRef = useRef(null);
  const navigate = useNavigate(); // Included navigate

  // --- State Definitions ---
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);
  const [error, setError] = useState("");
  const [departmentFetchError, setDepartmentFetchError] = useState("");
  const [actionError, setActionError] = useState(""); // Page-level action errors
  const [modalError, setModalError] = useState("");   // Modal SUBMIT action errors
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAuditorium, setFilterAuditorium] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [zoomedImageUrl, setZoomedImageUrl] = useState(null);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState(null);
  const [modalStartTime, setModalStartTime] = useState("");
  const [modalEndTime, setModalEndTime] = useState("");
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawBooking, setWithdrawBooking] = useState(null);
  // Modal Availability State
  const [isCheckingModalAvailability, setIsCheckingModalAvailability] = useState(false);
  const [modalAvailabilityError, setModalAvailabilityError] = useState(""); // CHECK error
  const [isModalSlotAvailable, setIsModalSlotAvailable] = useState(true);
  const [modalConflictDetails, setModalConflictDetails] = useState(null); // Stores conflict info

  // --- Constants ---
  const bookingLeadTimeHours = 2; // Configurable lead time

  // --- Helper Functions ---
  const showTemporaryFeedback = (setter, message, duration = 5000) => { setter(message); const timer = setTimeout(() => setter(""), duration); return () => clearTimeout(timer); };

  const formatDateTimeForInput = (isoString) => {
    if (!isoString) return ""; try { const dt = new Date(isoString); if (isNaN(dt.getTime())) throw new Error("Invalid date"); const localDt = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000); return localDt.toISOString().slice(0, 16); } catch (e) { console.error("Format date err:", e, isoString); return ""; }
  };

  const getMinDateTimeLocalString = useCallback(() => {
    try { const now = new Date(); const minDate = new Date(now.getTime() + (bookingLeadTimeHours || 2) * 36e5); const localMinDt = new Date(minDate.getTime() - minDate.getTimezoneOffset() * 60000); return localMinDt.toISOString().slice(0, 16); } catch (e) { const now=new Date(); const localNow=new Date(now.getTime()-now.getTimezoneOffset()*60000); return localNow.toISOString().slice(0,16); }
  }, [bookingLeadTimeHours]);

  // Add this function to handle time changes
  const handleTimeChange = (field, value) => {
    if (field === 'start') {
      setModalStartTime(value);
      // If end time exists and is before new start time, clear it
      if (modalEndTime && new Date(value) >= new Date(modalEndTime)) {
        setModalEndTime('');
      }
    } else {
      setModalEndTime(value);
    }
    // Reset availability check when times change
    setIsModalSlotAvailable(true);
    setModalConflictDetails(null);
    setModalAvailabilityError('');
  };

  // --- Data Fetching Callbacks ---
  const fetchMyBookings = useCallback(async () => { setIsLoading(true); setError(""); setActionError(""); setActionSuccess(""); const token = localStorage.getItem('authToken'); if (!token) { setError("Auth Error."); setIsLoading(false); return; } const url = `${API_BASE_URL}/api/bookings/mybookings`; console.log("Fetch bookings:", url); try { const res=await fetch(url, {headers: {"Authorization": `Bearer ${token}`, Accept:"json"}}); let data; const ct=res.headers.get('content-type'); if (ct?.includes('json')){data=await res.json();} else {const txt=await res.text(); throw new Error(`Non-JSON(${res.status}): ${txt.slice(0,150)}...`);} if (!res.ok) throw new Error(data.message || `Fetch fail(${res.status})`); if (!data.success || !Array.isArray(data.data)) throw new Error(data.message || "Invalid data."); const p=data.data.map(b => ({...b, id:b._id, department: b.department || {_id:null, name:'N/A'}})); setBookings(p); console.log("Bookings recv:", p.length); } catch (e) { console.error("Fetch err:", e); setError(e.message || "Load err."); setBookings([]); } finally { setIsLoading(false); } }, []);
  const fetchDepartments = useCallback(async () => { setIsLoadingDepartments(true); setDepartmentFetchError(""); const apiUrl = `${API_BASE_URL}/api/departments`; console.log("Fetch depts:", apiUrl); try { const res=await fetch(apiUrl, {headers:{Accept:'json'}}); if (!res.ok) { let m=`Dept fetch fail(${res.status})`; try { const d=await res.json(); m=d.message||m; } catch (e){} throw new Error(m); } const data=await res.json(); if (!data.success || !Array.isArray(data.data)) throw new Error(data.message || "Invalid format."); setDepartments(data.data); } catch (err) { console.error("Fetch depts err:", err); setDepartmentFetchError(err.message || "Load list err."); setDepartments([]); } finally { setIsLoadingDepartments(false); } }, []);

  // --- Check Availability (Frontend Helper) ---
  const checkAvailability = useCallback(async (startTime, endTime, auditoriumId, bookingIdToExclude) => {
    setIsCheckingModalAvailability(true); setModalConflictDetails(null); setModalAvailabilityError(""); let start, end;
    try { if(!startTime || !endTime) throw new Error("Time req."); start=new Date(startTime); end=new Date(endTime); if(isNaN(start)||isNaN(end)) throw new Error("Invalid date."); if(start>=end) throw new Error("End>start req."); const minValid = new Date(getMinDateTimeLocalString()); if (start < minValid) throw new Error(`Start >= ${bookingLeadTimeHours}h ahead.`);}
    catch(e) { setIsModalSlotAvailable(false); setModalConflictDetails(null); setModalAvailabilityError(e.message); setIsCheckingModalAvailability(false); return; }
    try {
      const token=localStorage.getItem('authToken'); if (!token) throw new Error("Auth required."); const apiUrl=`${API_BASE_URL}/api/bookings/check-availability`;
      const queryParams = new URLSearchParams({ auditoriumId, startTime:start.toISOString(), endTime:end.toISOString() });
      if (bookingIdToExclude) queryParams.append('excludeBookingId', bookingIdToExclude);
      console.log(`API Check MODAL: ${apiUrl}?${queryParams}`);
      const res = await fetch(`${apiUrl}?${queryParams.toString()}`, {headers:{'Authorization':`Bearer ${token}`, 'Accept':'json'}}); const data = await res.json(); if (!res.ok) throw new Error(data.message||`Check fail(${res.status})`);
      console.log("API Check Res:", data); setIsModalSlotAvailable(data.available);
      if (!data.available && data.conflictingBooking) setModalConflictDetails(data.conflictingBooking); else setModalConflictDetails(null);
      setModalAvailabilityError("");
    } catch (error) { console.error('Modal check err:', error); setModalAvailabilityError(`Check fail: ${error.message}`); setIsModalSlotAvailable(false); setModalConflictDetails(null); }
    finally { setIsCheckingModalAvailability(false); }
  }, [bookingLeadTimeHours, getMinDateTimeLocalString]);

  // --- Effects ---
  useEffect(() => { fetchMyBookings(); fetchDepartments(); }, [fetchMyBookings, fetchDepartments]); // Initial fetches

  useEffect(() => { // Filtering Logic
     const filtered = bookings.filter(b => { const lT = searchTerm.toLowerCase(); const sM=!searchTerm || (b.eventName?.toLowerCase().includes(lT)) || (b.description?.toLowerCase().includes(lT)); const stM = filterStatus === "all" || b.status === filterStatus; const aM = filterAuditorium === "all" || b.auditorium?.name === filterAuditorium; const dM = filterDepartment === "all" || b.department?._id === filterDepartment; const dtM = !filterDate || (b.startTime && format(parseISO(b.startTime), 'yyyy-MM-dd') === filterDate); return sM&&stM&&aM&&dM&&dtM; }); setFilteredBookings(filtered);
   }, [bookings, searchTerm, filterStatus, filterAuditorium, filterDepartment, filterDate]);

  const debouncedModalCheck = useMemo(() => debounce(checkAvailability, 750), [checkAvailability]); // Debounced check

  useEffect(() => { // Trigger Modal Check
     let isActive=true; if (isRescheduleModalOpen && modalStartTime && modalEndTime && rescheduleBooking?._id && rescheduleBooking?.auditorium?._id) {
       try { const start=new Date(modalStartTime), end=new Date(modalEndTime); if (!isNaN(start)&&!isNaN(end)&&start<end) { debouncedModalCheck(modalStartTime, modalEndTime, rescheduleBooking.auditorium._id, rescheduleBooking._id); } else { if (isActive) { setIsModalSlotAvailable(false); setModalConflictDetails(null); setModalAvailabilityError("Valid time required."); setIsCheckingModalAvailability(false); }}}
       catch(e) { if (isActive) { setIsModalSlotAvailable(false); setModalConflictDetails(null); setModalAvailabilityError("Invalid date format."); setIsCheckingModalAvailability(false); }}}
     else if (isRescheduleModalOpen) { if(isActive) { setIsModalSlotAvailable(true); setModalConflictDetails(null); setModalAvailabilityError(""); setIsCheckingModalAvailability(false); }}
     return () => {isActive=false;};
  }, [modalStartTime, modalEndTime, rescheduleBooking, isRescheduleModalOpen, debouncedModalCheck]);

  useEffect(() => {
    if (isRescheduleModalOpen) {
      console.log('Button disabled conditions:', {
        notAvailable: !isModalSlotAvailable,
        checking: isCheckingModalAvailability,
        submitting: isSubmittingReschedule,
        noStartTime: !modalStartTime,
        noEndTime: !modalEndTime,
        invalidTimeOrder: modalStartTime && modalEndTime && (new Date(modalStartTime) >= new Date(modalEndTime)),
        unchanged: modalStartTime && modalEndTime && 
          (formatDateTimeForInput(rescheduleBooking?.startTime) === modalStartTime && 
           formatDateTimeForInput(rescheduleBooking?.endTime) === modalEndTime)
      });
    }
  }, [isModalSlotAvailable, isCheckingModalAvailability, isSubmittingReschedule, 
      modalStartTime, modalEndTime, rescheduleBooking]);

  useEffect(() => { return () => { /* Cleanup on unmount */ }; }, []);

  // --- Action Handlers ---
  const handleWithdraw = async (booking) => {
    if (withdrawingId || isSubmittingReschedule) return;
    setWithdrawBooking(booking);
    setShowWithdrawModal(true);
  };

  const confirmWithdraw = async () => {
    if (!withdrawBooking || withdrawingId || isSubmittingReschedule) return;
    
    setActionError("");
    setActionSuccess("");
    setWithdrawingId(withdrawBooking._id);
    
    const token = localStorage.getItem('authToken');
    if (!token) {
        showTemporaryFeedback(setActionError, "Auth Error");
        setWithdrawingId(null);
        setShowWithdrawModal(false);
        setWithdrawBooking(null);
        return;
    }

    const url = `${API_BASE_URL}/api/bookings/${withdrawBooking._id}`;
    try {
        const res = await fetch(url, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`,
                Accept: "json"
            }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || `Withdrawal failed (${res.status})`);
        
        showTemporaryFeedback(setActionSuccess, data.message || "Successfully withdrawn!", 7000);
        setBookings(prev => prev.filter(b => b._id !== withdrawBooking._id));
    } catch (err) {
        console.error(`Withdraw error:`, err);
        showTemporaryFeedback(setActionError, err.message || "Failed to withdraw booking");
    } finally {
        setWithdrawingId(null);
        setShowWithdrawModal(false);
        setWithdrawBooking(null);
    }
};

  // --- Reschedule Modal Handlers ---
  const openRescheduleModal = (bookingId) => {
    if (withdrawingId || isSubmittingReschedule) return;
    const booking = bookings.find(b => b._id === bookingId);
    if (!booking || booking.status !== 'approved') { showTemporaryFeedback(setActionError, "Only approved can be rescheduled."); return; }
    const eventStart = booking.startTime ? parseISO(booking.startTime) : null; const now = new Date(); const minReqTime = new Date(now.getTime()+(bookingLeadTimeHours||2)*36e5);
    if (!eventStart || eventStart <= minReqTime) { showTemporaryFeedback(setActionError, `Must reschedule >= ${bookingLeadTimeHours}h before start.`); return; }
    // Reset all modal states
    setIsModalSlotAvailable(true); setModalConflictDetails(null); setIsCheckingModalAvailability(false); setModalAvailabilityError(""); setModalError(""); setActionError(""); setActionSuccess("");
    setRescheduleBooking(booking); setModalStartTime(formatDateTimeForInput(booking.startTime)); setModalEndTime(formatDateTimeForInput(booking.endTime)); setIsRescheduleModalOpen(true);
  };

  const closeRescheduleModal = () => {
    setIsRescheduleModalOpen(false);
    setTimeout(()=>{setRescheduleBooking(null); setModalStartTime(""); setModalEndTime(""); setModalError(""); setIsModalSlotAvailable(true); setModalConflictDetails(null); setIsCheckingModalAvailability(false); setModalAvailabilityError("");}, 300);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (isCheckingModalAvailability) { setModalError("Wait check..."); return; }
    if (!isModalSlotAvailable) { setModalError("Slot unavailable."); return; }
    if (!rescheduleBooking || isSubmittingReschedule) return;
    setModalError(""); setIsSubmittingReschedule(true); let startISO, endISO;
    try { // Validation block
        if(!modalStartTime||!modalEndTime) throw new Error("Times required."); const s=new Date(modalStartTime), n=new Date(modalEndTime); if(isNaN(s)||isNaN(n))throw new Error("Invalid format."); if(s>=n)throw new Error("End>start req."); const minS=new Date(new Date().getTime()+(bookingLeadTimeHours||2)*36e5); if (s<minS)throw new Error(`Start >= ${bookingLeadTimeHours}h ahead.`); if (formatDateTimeForInput(rescheduleBooking.startTime)===modalStartTime && formatDateTimeForInput(rescheduleBooking.endTime)===modalEndTime) throw new Error("Times unchanged."); startISO=s.toISOString(); endISO=n.toISOString();}
    catch (vErr) { setModalError(vErr.message); setIsSubmittingReschedule(false); return; }
    const token = localStorage.getItem('authToken'); if (!token) { setModalError("Auth Err."); setIsSubmittingReschedule(false); return; }
    const apiUrl = `${API_BASE_URL}/api/bookings/${rescheduleBooking._id}`;
    try { // API Call block
        const res = await fetch(apiUrl, { method:"PUT", headers:{ "Authorization":`Bearer ${token}`, "Content-Type":"application/json", Accept:"json" }, body:JSON.stringify({ newStartTime: startISO, newEndTime: endISO }) });
        let data; const ct=res.headers.get("content-type"); if(ct?.includes('json')){data=await res.json();} else {const txt=await res.text();throw new Error(`Non-JSON(${res.status}): ${txt.slice(0,150)}...`);}
        if (!res.ok) throw new Error(data.message||`Resched fail(${res.status})`);
        showTemporaryFeedback(setActionSuccess, data.message || "Reschedule sent!", 7000); setBookings(prev => prev.map(b => (b._id === rescheduleBooking._id ? { ...data.data, id: data.data._id } : b))); closeRescheduleModal(); }
    catch (err) { // API Error handling
        console.error(`Resched API err:`, err);
        if(err.message?.toLowerCase().includes("conflict")) { setModalError("Submit fail: Slot conflict."); checkAvailability(modalStartTime, modalEndTime, rescheduleBooking.auditorium?._id, rescheduleBooking._id); } // Recheck on conflict
        else { setModalError(err.message || "Error submitting."); } }
    finally { setIsSubmittingReschedule(false); }
  };

  // --- Render Component UI ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 relative">
        <h1 className="text-3xl sm:text-4xl font-bold text-center text-red-800 mb-8 tracking-tight"> My Booking History </h1>
        {actionError && (<div className="mb-6 p-3 text-center text-sm font-medium text-red-800 bg-red-100 rounded-md border border-red-200 shadow-sm" role="alert">{actionError}</div>)}
        {actionSuccess && (<div className="mb-6 p-3 text-center text-sm font-medium text-green-800 bg-green-100 rounded-md border border-green-200 shadow-sm" role="alert">{actionSuccess}</div>)}
        {isLoading && (<div className="text-center py-16"><p className="text-lg text-gray-500 animate-pulse">Loading...</p></div>)}
        {error && !isLoading && (<div className="my-8 p-4 text-center text-red-800 bg-red-100 rounded-lg border border-red-200 shadow"><p><strong>Error:</strong> {error}</p><button onClick={fetchMyBookings} className="mt-2 px-3 py-1 text-sm font-medium rounded bg-red-600 text-white hover:bg-red-700">Retry</button></div>)}

        {!isLoading && !error && (
          <>
            {/* --- Filter Bar --- */}
            <div className="mb-8 p-3 sm:p-4 bg-white/95 rounded-lg shadow-md sticky top-4 z-30 backdrop-blur border border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 items-center">
                 {/* Search Input */}
                 <input type="text" placeholder="🔍 Search Event..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="p-2 px-3 rounded-md border border-gray-300 shadow-sm w-full text-sm focus:ring-red-500 focus:border-red-500 transition"/>
                 {/* Status Filter */}
                 <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="p-2 px-3 rounded-md border border-gray-300 shadow-sm w-full text-sm focus:ring-red-500 focus:border-red-500 transition">
                   <option value="all">All Status</option><option value="approved">Approved</option><option value="pending">Pending</option><option value="rejected">Rejected</option>
                 </select>
                 {/* Auditorium Filter */}
                 <select value={filterAuditorium} onChange={(e) => setFilterAuditorium(e.target.value)} className="p-2 px-3 rounded-md border border-gray-300 shadow-sm w-full text-sm focus:ring-red-500 focus:border-red-500 transition">
                   <option value="all">All Auditoriums</option>
                   {[...new Set(bookings.map(b => b.auditorium?.name).filter(Boolean))].sort().map((name, i) => (<option key={i} value={name}>{name}</option>))}
                 </select>
                 {/* Department Filter */}
                 <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className="p-2 px-3 rounded-md border border-gray-300 shadow-sm w-full text-sm focus:ring-red-500 focus:border-red-500 transition disabled:bg-gray-100 disabled:cursor-not-allowed" disabled={isLoadingDepartments || !!departmentFetchError || departments.length === 0}>
                   <option value="all">All Departments</option>
                   {departmentFetchError ? (<option disabled>Error</option>) : isLoadingDepartments ? (<option disabled>Loading...</option>) : (departments.map((dept) => (<option key={dept._id} value={dept._id}>{dept.name} {dept.code ? `(${dept.code})` : ''}</option>)))}
                 </select>
                 {/* Date Filter */}
                 <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="p-2 px-3 rounded-md border border-gray-300 shadow-sm w-full text-sm focus:ring-red-500 focus:border-red-500 transition"/>
              </div>
               {departmentFetchError && <p className="text-xs text-red-500 mt-2">Dept filter error: {departmentFetchError}</p>}
             </div>

            {/* --- Booking List / No Results --- */}
            {filteredBookings.length === 0 ? (
              <div className="text-center py-16"> <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> <h3 className="mt-2 text-sm font-medium text-gray-900">{bookings.length === 0 ? "No bookings found" : "No bookings match filters"}</h3> <p className="mt-1 text-sm text-gray-500">{bookings.length === 0 ? "No requests yet." : "Try adjusting filters."}</p> </div>
             ) : (
              <div className="space-y-6">
                {filteredBookings.map((booking) => {
                    const eventStart = booking.startTime ? parseISO(booking.startTime) : null; const now = new Date(); const minReqTime = new Date(now.getTime()+(bookingLeadTimeHours||2)*36e5); const canWdTime=eventStart&&eventStart>minReqTime; const wdAllowed = booking.status==='pending'||(booking.status==='approved'&&canWdTime); const rsAllowed = booking.status==='approved'&&eventStart&&eventStart>now; const imgUrl=booking.eventImages?.[0]?`${API_BASE_URL}${booking.eventImages[0]}`:null; const actInProgress=!!(withdrawingId||isSubmittingReschedule); const thisWdProgress=withdrawingId===booking._id;
                    return (
                        <div key={booking._id} className="bg-white rounded-xl shadow-lg border border-gray-200 p-4 sm:p-6 overflow-hidden hover:shadow-md transition-shadow duration-200">
                            <div className="flex flex-col md:flex-row gap-5 items-start">
                                {/* Image */}
                                <div className={`flex-shrink-0 w-full md:w-44 h-44 rounded-lg shadow bg-gray-100 flex items-center justify-center overflow-hidden text-gray-400 relative ${imgUrl ? "cursor-pointer hover:opacity-90 transition-opacity" : ""}`} onClick={() => imgUrl && setZoomedImageUrl(imgUrl)} title={imgUrl ? "Zoom Poster" : "No Poster"}>
                                    {imgUrl ? (<img src={imgUrl} alt={`${booking.eventName || "Event"} Poster`} className="w-full h-full object-cover" onError={(e)=>{if(e.target.src!==ERROR_IMAGE_URL){e.target.onerror=null; e.target.src=ERROR_IMAGE_URL;}}} loading="lazy"/>) : (<ImagePlaceholderIcon />)}
                                </div>
                                {/* Details */}
                                <div className="flex-1 min-w-0 space-y-2.5">
                                    {/* Header */}
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-1"> <h2 className="text-xl font-semibold text-gray-800 truncate pr-2" title={booking.eventName}>{booking.eventName || <span className="italic text-gray-400">Untitled Event</span>}</h2> <span className={`flex-shrink-0 mt-1 sm:mt-0 px-2.5 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${booking.status==="approved"?"bg-green-100 text-green-800 border-green-200":booking.status==="pending"?"bg-yellow-100 text-yellow-800 border-yellow-200":booking.status==="rejected"?"bg-red-100 text-red-800 border-red-200":"bg-gray-100 text-gray-800 border-gray-200"}`}>{booking.status?.toUpperCase()||"N/A"}</span> </div>
                                    {/* Description */}
                                    <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{booking.description || <span className="italic text-gray-400">No description provided.</span>}</p>
                                    {/* Info List */}
                                    <div className="text-xs sm:text-sm text-gray-500 space-y-1.5 border-t border-gray-100 pt-2.5 mt-2.5"> <p><strong className="font-medium text-gray-700 w-20 inline-block">When:</strong> {booking.startTime ? format(parseISO(booking.startTime), 'MMM d, yyyy, h:mm a') : "N/A"} - {booking.endTime ? format(parseISO(booking.endTime), 'h:mm a') : "N/A"}</p> <p><strong className="font-medium text-gray-700 w-20 inline-block">Where:</strong> {booking.auditorium?.name ?? <span className="italic">N/A</span>}{booking.auditorium?.location && ` (${booking.auditorium.location})`}</p> <p><strong className="font-medium text-gray-700 w-20 inline-block">Dept:</strong> {booking.department?.name ?? <span className="italic">N/A</span>}{booking.department?.code && ` (${booking.department.code})`}</p> {booking.status==="rejected" && booking.rejectionReason && (<blockquote className="mt-2 pl-3 border-l-4 border-red-300 bg-red-50 text-red-800 text-xs italic py-1"><strong className="not-italic font-medium text-red-900">Reason:</strong> {booking.rejectionReason}</blockquote>)} </div>
                                    {/* Action Buttons */}
                                    {(wdAllowed || rsAllowed) && (
                                        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100 mt-3">
                                        {wdAllowed && (
                                            <button
                                                onClick={() => handleWithdraw(booking)}
                                                className="px-3 py-1.5 text-xs font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                                disabled={actInProgress}
                                            >
                                                Withdraw Request
                                            </button>
                                        )}
                                        {rsAllowed && <button onClick={()=>openRescheduleModal(booking._id)} disabled={actInProgress} className="px-3 py-1.5 text-xs font-medium rounded-md shadow-sm text-gray-700 bg-yellow-400 hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition">Request Reschedule</button>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                 })}
              </div>
             )}
          </>
        )}

        {/* --- Reschedule Modal --- */}
        {isRescheduleModalOpen && rescheduleBooking && (
          <div className="fixed inset-0 z-50 bg-gray-700/50 backdrop-blur-sm flex items-center justify-center overflow-y-auto p-4 animate-fade-in-fast" onClick={closeRescheduleModal}>
            <div className="relative bg-white w-full max-w-lg rounded-lg shadow-xl p-6 animate-modalEnter" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex justify-between items-center border-b pb-3 mb-5"> <h2 className="text-xl font-semibold text-gray-800">Request Reschedule</h2> <button onClick={closeRescheduleModal} className="p-1 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-700"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg></button> </div>
              {/* Form */}
              <form onSubmit={handleModalSubmit} className="space-y-4">
                {/* Original Info Display */}
                <div className="text-sm p-3 bg-gray-50 rounded border border-gray-200 space-y-1"> <p><strong>Event:</strong> {rescheduleBooking.eventName}</p> <p><strong>Auditorium:</strong> {rescheduleBooking.auditorium?.name ?? 'N/A'}</p> <p className="mt-1"><strong>Current Start:</strong> {rescheduleBooking.startTime ? format(parseISO(rescheduleBooking.startTime), 'Pp') : 'N/A'}</p> <p><strong>Current End:</strong> {rescheduleBooking.endTime ? format(parseISO(rescheduleBooking.endTime), 'p') : 'N/A'}</p> </div>
                {/* Time Inputs */}
                <div> <label htmlFor="modalStartTime" className="block text-sm font-medium text-gray-700 mb-1">New Start Time <span className="text-red-500">*</span></label> <input ref={modalStartTimeRef} id="modalStartTime" type="datetime-local" value={modalStartTime} onChange={e => handleTimeChange('start', e.target.value)} required disabled={isSubmittingReschedule} min={getMinDateTimeLocalString()} className="w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"/> </div>
                <div> <label htmlFor="modalEndTime" className="block text-sm font-medium text-gray-700 mb-1">New End Time <span className="text-red-500">*</span></label> <input ref={modalEndTimeRef} id="modalEndTime" type="datetime-local" value={modalEndTime} onChange={e => handleTimeChange('end', e.target.value)} required disabled={isSubmittingReschedule} min={modalStartTime||getMinDateTimeLocalString()} className="w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"/> </div>
                {/* --- Availability Feedback Area --- */}
                 <div className="mt-3 mb-1 min-h-[50px] text-sm flex justify-center items-center p-2">
                  {isCheckingModalAvailability && ( <p className="text-gray-500 italic flex items-center animate-pulse"><svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"/><path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75" fill="currentColor"/></svg>Checking...</p> )}
                  {!isCheckingModalAvailability && modalAvailabilityError && ( <p className="text-red-600 font-semibold">{modalAvailabilityError}</p> )}
                  {!isCheckingModalAvailability && !modalAvailabilityError && !isModalSlotAvailable && modalConflictDetails && (
                      <div className="text-xs text-red-800 bg-red-50 p-3 rounded-md border border-red-200 w-full text-center shadow-sm"> <p className="font-bold mb-1">Slot Unavailable</p> <p>Conflicts with: "{modalConflictDetails.eventName}"</p> <p>({new Date(modalConflictDetails.startTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})} - {new Date(modalConflictDetails.endTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})})</p> </div>
                   )}
                   {!isCheckingModalAvailability && !modalAvailabilityError && isModalSlotAvailable && modalStartTime && modalEndTime && (new Date(modalStartTime) < new Date(modalEndTime)) && (
                      <p className="text-sm text-green-700 font-semibold flex items-center"><svg className="w-4 h-4 mr-1 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>Slot Available</p>
                   )}
                 </div>
                 {modalError && (<p className="text-sm text-red-600 text-center p-2 bg-red-50 rounded border border-red-200">{modalError}</p>)} {/* Submit Error */}
                 {/* Actions */}
                 <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-2">
                   <button type="button" onClick={closeRescheduleModal} disabled={isSubmittingReschedule} className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                   <button type="submit" disabled={ !isModalSlotAvailable || isCheckingModalAvailability || isSubmittingReschedule || !modalStartTime || !modalEndTime || (new Date(modalStartTime) >= new Date(modalEndTime)) || (formatDateTimeForInput(rescheduleBooking?.startTime) === modalStartTime && formatDateTimeForInput(rescheduleBooking?.endTime) === modalEndTime) } className="px-5 py-2 text-sm font-semibold rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none ring-offset-1 focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px] text-center">
                     {isSubmittingReschedule?"Submitting...":!isModalSlotAvailable?"Unavailable":isCheckingModalAvailability?"Checking...":"Submit Request"}
                   </button>
                 </div>
               </form>
             </div>
           </div>
        )}

        {/* --- Image Zoom Modal --- */}
        {zoomedImageUrl && ( <div className="fixed inset-0 z-[60] bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in-fast" onClick={() => setZoomedImageUrl(null)}> <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg shadow-xl overflow-hidden"> <img src={zoomedImageUrl} alt="Zoomed Poster" className="block max-w-full max-h-[90vh] object-contain mx-auto my-auto" onClick={(e)=>e.stopPropagation()}/> <button onClick={()=>setZoomedImageUrl(null)} className="absolute top-2 right-2 bg-white/70 hover:bg-white rounded-full p-1"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 18L18 6M6 6l12 12" /></svg></button> </div> </div> )}

        {/* Withdraw Confirmation Modal */}
        {showWithdrawModal && withdrawBooking && (
            <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="withdraw-modal" role="dialog" aria-modal="true">
                <div className="flex items-center justify-center min-h-screen p-4">
                    {/* Enhanced backdrop with stronger blur effect */}
                    <div 
                        className="fixed inset-0 bg-black/40 backdrop-blur-md transition-all duration-300 animate-fade-in-fast" 
                        onClick={() => setShowWithdrawModal(false)}
                    ></div>

                    {/* Modal content - Added scale animation and glass effect */}
                    <div className="relative bg-white/90 backdrop-blur-sm rounded-lg max-w-md w-full shadow-xl animate-modalEnter">
                        {/* Rest of the modal content remains the same */}
                        <div className="p-6">
                            {/* Warning Icon */}
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                </svg>
                            </div>

                            {/* Content */}
                            <div className="text-center">
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    Confirm Withdrawal
                                </h3>
                                <div className="mt-2 space-y-2">
                                    <p className="text-sm text-gray-500">
                                        Are you sure you want to withdraw your booking for:
                                    </p>
                                    <p className="text-md font-medium text-gray-800">
                                        {withdrawBooking.eventName}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        {format(parseISO(withdrawBooking.startTime), 'MMM d, yyyy, h:mm a')}
                                    </p>
                                    <p className="text-xs text-red-600 mt-2">
                                        This action cannot be undone.
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                                    onClick={() => setShowWithdrawModal(false)}
                                    disabled={withdrawingId}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                    onClick={confirmWithdraw}
                                    disabled={withdrawingId}
                                >
                                    {withdrawingId ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Withdrawing...
                                        </>
                                    ) : (
                                        'Withdraw Booking'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

      </div> {/* End Page Container */}
    </div>
  );
}

export default BookingHistory;

// Ensure these animations are defined in index.css or global styles
/*
@keyframes fadeIn {
    from {
        opacity: 0;
        backdrop-filter: blur(0);
    }
    to {
        opacity: 1;
        backdrop-filter: blur(8px);
    }
}

.animate-fade-in-fast {
    animation: fadeIn 0.2s ease-out forwards;
}

@keyframes modalEnter {
    from {
        transform: scale(0.95);
        opacity: 0;
    }
    to {
        transform: scale(1);
        opacity: 1;
    }
}

.animate-modalEnter {
    animation: modalEnter 0.3s ease-out forwards;
}
*/