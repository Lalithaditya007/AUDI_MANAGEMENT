import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from 'react-router-dom'; // Added useNavigate
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { motion, AnimatePresence } from "framer-motion"; // Added AnimatePresence
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from "recharts";

// --- Helper Components (Keep existing StatsCard, TrendChart) ---
function StatsCard({ title, value, color = "text-gray-900" }) { /* ... existing code ... */ 
  const isLoadingValue = value === '...' || value === undefined || value === null;
  const displayValue = isLoadingValue ? '...' : (typeof value === 'string' && value.length > 20 ? `${value.substring(0, 18)}...` : value);
  return ( <div className="bg-white p-4 sm:p-6 rounded-lg shadow hover:shadow-lg transition-shadow duration-200 ease-in-out"> <h3 className="text-base sm:text-lg font-semibold text-gray-500 mb-1 truncate" title={title}> {title} </h3> <p className={`text-3xl font-bold ${color} ${isLoadingValue ? 'animate-pulse' : ''}`}> {displayValue} </p> </div> );
}
const TrendChart = ({ title, data, isLoading, error, xAxisDataKey, lineDataKey, lineColor, yAxisLabel, emptyMessage, periodButtons, currentPeriod, onPeriodChange, selector }) => { /* ... existing code ... */ 
   const formatTrendDateTick = (tickItem) => { try { return format(parseISO(tickItem), 'MMM d'); } catch { return tickItem; } }; const chartMinHeight = 350; const containerMinHeight = 450;
   return ( <div className={`bg-white p-4 sm:p-6 rounded-lg shadow min-h-[${containerMinHeight}px] flex flex-col`}> <div className="flex justify-between items-start mb-4 flex-shrink-0 flex-wrap gap-2"> <h2 className="text-lg sm:text-xl font-semibold text-gray-700 whitespace-nowrap mr-4">{title}</h2> <div className="flex items-center gap-4 flex-wrap"> {selector && (<div className="flex-1 min-w-[180px]">{selector}</div>)} {periodButtons && (<div className="flex items-center gap-1 sm:gap-2 flex-wrap flex-shrink-0"> <span className="text-xs text-gray-500">Period:</span> {[7, 30, 90].map(dayOption => ( <button key={dayOption} onClick={() => onPeriodChange(dayOption)} disabled={isLoading} className={`px-2 py-0.5 text-xs rounded ${currentPeriod === dayOption ? 'bg-red-600 text-white font-semibold shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} disabled:opacity-50 transition-colors duration-150`}> {dayOption}d </button> ))} </div>)} </div> </div> <div className="flex-grow flex items-center justify-center relative min-h-[300px]"> {isLoading && (<div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50 z-10"><p className="text-sm text-gray-500 animate-pulse">Loading chart...</p></div>)} {error && !isLoading && (<div className="absolute inset-0 flex items-center justify-center p-4"><p className="text-sm text-red-500 px-4 text-center">Error: {error}</p></div>)} {!isLoading && !error && (!data || data.length === 0) && (<div className="absolute inset-0 flex items-center justify-center p-4"><p className="text-sm text-gray-500 italic">{emptyMessage || 'No data available.'}</p></div>)} {!isLoading && !error && data && data.length > 0 && ( <ResponsiveContainer width="99%" height={chartMinHeight}> <LineChart data={data} margin={{ top: 5, right: 20, bottom: 30, left: 0 }}> <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" /> <XAxis dataKey={xAxisDataKey} tickFormatter={formatTrendDateTick} tick={{ fontSize: 10 }} interval="preserveStartEnd" dy={10} angle={-10} textAnchor="end"/> <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={30} label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', style: { fontSize: '10px', textAnchor: 'middle' }, dy: -10 } : undefined}/> <Tooltip formatter={(value) => [value?.toLocaleString() ?? '0', 'Count']} labelFormatter={(label) => { try { return format(parseISO(label), 'EEE, MMM d, yyyy'); } catch { return label; } }}/> <Legend verticalAlign="top" height={30} /> <Line type="monotone" dataKey={lineDataKey} name="Requests" stroke={lineColor || "#8884d8"} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 6 }}/> </LineChart> </ResponsiveContainer> )} </div> </div> );
};

// --- Main AdminDashboard Component ---

const AdminDashboard = () => {
  const navigate = useNavigate(); // Hook for navigation

  // --- State Definitions ---
  // Existing states...
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState("");
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [isLoadingUpcoming, setIsLoadingUpcoming] = useState(true);
  const [upcomingError, setUpcomingError] = useState("");
  const [upcomingDays, setUpcomingDays] = useState(7);
  const [auditoriums, setAuditoriums] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true);
  const [dropdownError, setDropdownError] = useState("");
  const [bookingTrends, setBookingTrends] = useState([]);
  const [isLoadingTrends, setIsLoadingTrends] = useState(true);
  const [trendsError, setTrendsError] = useState("");
  const [trendsDays, setTrendsDays] = useState(30);
  const [selectedAudiId, setSelectedAudiId] = useState('');
  const [audiTrendData, setAudiTrendData] = useState([]);
  const [isLoadingAudiTrends, setIsLoadingAudiTrends] = useState(false);
  const [audiTrendsError, setAudiTrendsError] = useState("");
  const [audiTrendsDays, setAudiTrendsDays] = useState(30);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [deptTrendData, setDeptTrendData] = useState([]);
  const [isLoadingDeptTrends, setIsLoadingDeptTrends] = useState(false);
  const [deptTrendsError, setDeptTrendsError] = useState("");
  const [deptTrendsDays, setDeptTrendsDays] = useState(30);

  // --- NEW State for Modal ---
  const [actionRequiredBookings, setActionRequiredBookings] = useState([]);
  const [isLoadingModalData, setIsLoadingModalData] = useState(true); // Start true to fetch on load
  const [modalError, setModalError] = useState("");
  const [isActionModalOpen, setIsActionModalOpen] = useState(false); // Controls modal visibility
  // --- END NEW State ---

  // --- API Fetching Helper (No changes needed) ---
  const fetchData = useCallback(async (url, token, signal) => { /* ... existing code ... */ 
    console.log(`[API Call] Fetching from ${url}`); try { const response = await fetch(url, { signal, headers: { Authorization: `Bearer ${token}`, Accept: "application/json", }, }); let data; const contentType = response.headers.get("content-type"); if (contentType?.includes("application/json")) { data = await response.json(); } else { const text = await response.text(); if (!response.ok) { throw new Error(`Server Error ${response.status}: ${text.substring(0, 150)}...`); } else { console.warn(`[API Warning] Received non-JSON success response from ${url}`); return null; } } if (!response.ok) { throw new Error(data.message || `Fetch failed: ${response.status}`); } if (data.success && data.hasOwnProperty('data')) { console.log(`[API Response] Success from ${url}`); return data.data; } else { throw new Error(data.message || "Invalid data structure received."); } } catch (error) { if (error.name === 'AbortError') { console.log('Fetch aborted:', url); return undefined; } else { console.error(`[Fetch Error] from ${url}:`, error); throw error; } }
  }, []);

  // --- UseEffect Hooks for Data Fetching ---

  // Effect 1: Fetch Initial Dashboard Data (Stats, Upcoming, Dropdowns, Overall Trends)
  useEffect(() => {
    // ... (keep existing implementation) ...
    const abortController = new AbortController(); const token = localStorage.getItem("authToken"); const userRole = localStorage.getItem("userRole"); if (!token || userRole !== "admin") { setStatsError("Access Denied."); setIsLoadingStats(false); setIsLoadingUpcoming(false); setIsLoadingDropdowns(false); setIsLoadingTrends(false); return; }
    const fetchInitialData = async () => { setStatsError(''); setUpcomingError(''); setDropdownError(''); setTrendsError(''); setIsLoadingStats(true); setIsLoadingUpcoming(true); setIsLoadingDropdowns(true); setIsLoadingTrends(true); const apiUrlBase = import.meta.env.VITE_API_URL || "http://localhost:5001"; const statsUrl = `${apiUrlBase}/api/bookings/admin/stats`; const upcomingUrl = `${apiUrlBase}/api/bookings/admin/upcoming?days=${upcomingDays}`; const audiUrl = `${apiUrlBase}/api/auditoriums`; const deptUrl = `${apiUrlBase}/api/departments`; const trendsUrl = `${apiUrlBase}/api/bookings/admin/trends?days=${trendsDays}`;
      try { const [statsResult, upcomingResult, audiResult, deptResult, trendsResult] = await Promise.allSettled([ fetchData(statsUrl, token, abortController.signal), fetchData(upcomingUrl, token, abortController.signal), fetchData(audiUrl, token, abortController.signal), fetchData(deptUrl, token, abortController.signal), fetchData(trendsUrl, token, abortController.signal) ]);
        if (statsResult.status === 'fulfilled' && statsResult.value) { setStats({ total: statsResult.value.total ?? 0, pending: statsResult.value.pending ?? 0, approved: statsResult.value.approved ?? 0, rejected: statsResult.value.rejected ?? 0, }); } else if (statsResult.status === 'rejected') { setStatsError(statsResult.reason.message || 'Failed to load stats'); }
        if (upcomingResult.status === 'fulfilled' && Array.isArray(upcomingResult.value)) { setUpcomingBookings(upcomingResult.value); } else if (upcomingResult.status === 'rejected') { setUpcomingError(upcomingResult.reason.message || 'Failed to load upcoming events'); }
        if (audiResult.status === 'fulfilled' && Array.isArray(audiResult.value)) { setAuditoriums(audiResult.value); } else if (audiResult.status === 'rejected') { setDropdownError(prev => prev + 'Auditoriums Failed. '); }
        if (deptResult.status === 'fulfilled' && Array.isArray(deptResult.value)) { setDepartments(deptResult.value); } else if (deptResult.status === 'rejected') { setDropdownError(prev => prev + 'Departments Failed. '); }
        if (trendsResult.status === 'fulfilled' && Array.isArray(trendsResult.value)) { setBookingTrends(trendsResult.value); } else if (trendsResult.status === 'rejected') { setTrendsError(trendsResult.reason.message || 'Failed to load overall trends'); }
      } catch (error) { if (error.name !== 'AbortError') { console.error("Unexpected error during initial data fetch:", error); if (!statsError && !upcomingError && !dropdownError && !trendsError) { setStatsError("Failed to load dashboard data."); } } }
      finally { if (!abortController.signal.aborted) { setIsLoadingStats(false); setIsLoadingUpcoming(false); setIsLoadingDropdowns(false); setIsLoadingTrends(false); } }
    }; fetchInitialData(); return () => abortController.abort();
  }, [fetchData, upcomingDays, trendsDays]);

  // Effect 2: Set default dropdown selections after data loads
  useEffect(() => {
    // ... (keep existing implementation) ...
    if (!isLoadingDropdowns && auditoriums.length > 0 && departments.length > 0) { const ksAudi = auditoriums.find(a => a.name.toLowerCase().includes('ks') || a.name.toLowerCase().includes('kode satyanarayana')); const itDept = departments.find(d => d.name.toLowerCase().includes('information technology') || d.name.toLowerCase().includes('it')); if (ksAudi && !selectedAudiId) setSelectedAudiId(ksAudi._id); if (itDept && !selectedDeptId) setSelectedDeptId(itDept._id); }
  }, [auditoriums, departments, isLoadingDropdowns, selectedAudiId, selectedDeptId]); // Added selectedAudiId and selectedDeptId to dependencies to prevent re-setting if already selected

  // Effect 3: Fetch Auditorium Specific Trends
  useEffect(() => {
    // ... (keep existing implementation) ...
    if (selectedAudiId === '') { setAudiTrendData([]); setIsLoadingAudiTrends(false); setAudiTrendsError(""); return; } const abortController = new AbortController(); const token = localStorage.getItem("authToken"); const userRole = localStorage.getItem("userRole"); if (!token || userRole !== "admin") { setIsLoadingAudiTrends(false); setAudiTrendsError("Access Denied."); return; }
    const fetchAudiTrendData = async () => { setIsLoadingAudiTrends(true); setAudiTrendsError(""); const apiUrl = `${import.meta.env.VITE_API_URL || "http://localhost:5001"}/api/bookings/admin/trends?days=${audiTrendsDays}&auditoriumId=${selectedAudiId}`; try { const data = await fetchData(apiUrl, token, abortController.signal); if (data !== undefined && Array.isArray(data)) { setAudiTrendData(data); } else if (data !== undefined) { throw new Error("Invalid format received for auditorium trends."); } } catch (err) { if (err.name !== 'AbortError') { console.error(`Error fetching trends for auditorium ${selectedAudiId}:`, err); setAudiTrendsError(err.message || "Could not load trends."); setAudiTrendData([]); } } finally { if (!abortController.signal.aborted) { setIsLoadingAudiTrends(false); } } }; fetchAudiTrendData(); return () => abortController.abort();
  }, [fetchData, selectedAudiId, audiTrendsDays]);

  // Effect 4: Fetch Department Specific Trends
  useEffect(() => {
    // ... (keep existing implementation) ...
    if (selectedDeptId === '') { setDeptTrendData([]); setIsLoadingDeptTrends(false); setDeptTrendsError(""); return; } const abortController = new AbortController(); const token = localStorage.getItem("authToken"); const userRole = localStorage.getItem("userRole"); if (!token || userRole !== "admin") { setIsLoadingDeptTrends(false); setDeptTrendsError("Access Denied."); return; }
    const fetchDeptTrendData = async () => { setIsLoadingDeptTrends(true); setDeptTrendsError(""); const apiUrl = `${import.meta.env.VITE_API_URL || "http://localhost:5001"}/api/bookings/admin/trends?days=${deptTrendsDays}&departmentId=${selectedDeptId}`; try { const data = await fetchData(apiUrl, token, abortController.signal); if (data !== undefined && Array.isArray(data)) { setDeptTrendData(data); } else if (data !== undefined) { throw new Error("Invalid format received for department trends."); } } catch (err) { if (err.name !== 'AbortError') { console.error(`Error fetching trends for department ${selectedDeptId}:`, err); setDeptTrendsError(err.message || "Could not load trends."); setDeptTrendData([]); } } finally { if (!abortController.signal.aborted) { setIsLoadingDeptTrends(false); } } }; fetchDeptTrendData(); return () => abortController.abort();
  }, [fetchData, selectedDeptId, deptTrendsDays]);

  // --- NEW Effect 5: Fetch Action Required Bookings on Mount ---
  useEffect(() => {
    const abortController = new AbortController();
    const token = localStorage.getItem("authToken");
    const userRole = localStorage.getItem("userRole");

    if (!token || userRole !== "admin") {
      // Don't show modal if not admin, maybe set an error if needed elsewhere
      setIsLoadingModalData(false);
      return;
    }

    const fetchActionRequired = async () => {
      setIsLoadingModalData(true);
      setModalError('');
      const apiUrl = `${import.meta.env.VITE_API_URL || "http://localhost:5001"}/api/bookings/admin/pending-upcoming`;
      console.log("[API Call] Fetching action required bookings for modal:", apiUrl);

      try {
        const data = await fetchData(apiUrl, token, abortController.signal);
        if (data !== undefined && Array.isArray(data)) {
          setActionRequiredBookings(data);
          if (data.length > 0) {
            setIsActionModalOpen(true); // Open modal only if there are bookings
            console.log(`[Modal] Found ${data.length} bookings requiring action.`);
          } else {
            console.log(`[Modal] No bookings requiring immediate action found.`);
          }
        } else if (data !== undefined) {
          throw new Error("Invalid format received for pending upcoming bookings.");
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error("Error fetching action required bookings:", err);
          setModalError(err.message || "Could not load pending requests for modal.");
          // Optionally open modal to show error? Or just log?
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoadingModalData(false);
        }
      }
    };

    fetchActionRequired();

    return () => abortController.abort();
  }, [fetchData]); // Run once on mount (fetchData is stable)
  // --- END NEW Effect ---


  // --- Chart Data Preparation (No changes) ---
  const PIE_COLORS = ["#FACC15", "#22C55E", "#EF4444"];
  const pieData = useMemo(() => [ /* ... existing code ... */ 
    { name: "Pending", value: stats.pending, color: PIE_COLORS[0] }, { name: "Approved", value: stats.approved, color: PIE_COLORS[1] }, { name: "Rejected", value: stats.rejected, color: PIE_COLORS[2] }, ].filter(entry => entry.value > 0), [stats.pending, stats.approved, stats.rejected]
  );

  // --- Derived State (No changes) ---
  const showLoadingIndicator = isLoadingStats && isLoadingUpcoming && isLoadingDropdowns && isLoadingTrends;

  // --- Helper Function for Relative Time Display (No changes) ---
  const formatRelativeDate = (isoDateString) => { /* ... existing code ... */ 
    if (!isoDateString) return 'N/A'; try { const date = parseISO(isoDateString); if (isToday(date)) return 'Today'; if (isTomorrow(date)) return 'Tomorrow'; const now = new Date(); const dateStartOfDay = date.setHours(0, 0, 0, 0); const nowStartOfDay = now.setHours(0, 0, 0, 0); const diffDays = Math.ceil((dateStartOfDay - nowStartOfDay) / (1000 * 60 * 60 * 24)); if (diffDays > 0 && diffDays <= 6) { return format(date, 'EEEE'); } return format(date, 'EEE, MMM d'); } catch (e) { console.error("Error formatting relative date:", e); return "Invalid Date"; }
  };

  // --- Render Dashboard UI ---
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-900">
          Admin Dashboard
        </h1>

        {/* Initial Loading Indicator */}
        {showLoadingIndicator && ( <div className="text-center py-10"><p className="text-lg text-gray-500 animate-pulse">Loading dashboard...</p></div> )}
        {/* Access Denied Message */}
        {statsError === "Access Denied." && ( <div className="mb-6 p-4 text-center text-red-700 bg-red-100 rounded border border-red-200" role="alert"> <p><strong>Access Denied:</strong> Admin privileges required.</p> </div> )}
        {/* Generic Stats Error Message */}
        {statsError && statsError !== "Access Denied." && !showLoadingIndicator && ( <div className="mb-6 p-4 text-center text-red-700 bg-red-100 rounded border border-red-200" role="alert"> <p><strong>Error loading stats:</strong> {statsError}</p> </div> )}

        {/* Render Main Content only if access is allowed */}
        {statsError !== "Access Denied." && (
          <div className="space-y-8">
            {/* Row 1: Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {/* ... StatsCard components ... */}
               <StatsCard title="Total Requests" value={isLoadingStats ? '...' : stats.total} color="text-purple-600"/>
               <StatsCard title="Pending" value={isLoadingStats ? '...' : stats.pending} color="text-yellow-500"/>
               <StatsCard title="Approved" value={isLoadingStats ? '...' : stats.approved} color="text-green-500"/>
               <StatsCard title="Rejected" value={isLoadingStats ? '...' : stats.rejected} color="text-red-500"/>
            </div>
            {/* Row 2: Pie Chart & Upcoming Events */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
               {/* Pie Chart */}
               <div className="bg-white p-4 sm:p-6 rounded-lg shadow min-h-[400px] flex flex-col"> <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-700 flex-shrink-0"> Request Distribution </h2> <div className="flex-grow flex items-center justify-center"> {isLoadingStats && (<p>Loading chart...</p>)} {statsError && !isLoadingStats && (<p>Error loading stats</p>)} {!isLoadingStats && !statsError && pieData.length === 0 && (<p>No request data</p>)} {!isLoadingStats && !statsError && pieData.length > 0 && ( <ResponsiveContainer width="99%" height={300}> <PieChart> <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={50} labelLine={false} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}> {pieData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} /> ))} </Pie> <Tooltip formatter={(value) => value?.toLocaleString() ?? ''} /> <Legend iconSize={10} verticalAlign="bottom" height={36} /> </PieChart> </ResponsiveContainer> )} </div> </div>
               {/* Upcoming Events */}
               <div className="bg-white p-4 sm:p-6 rounded-lg shadow h-[400px] flex flex-col"> <div className="flex justify-between items-center mb-4 flex-shrink-0 flex-wrap gap-2"> <h2 className="text-lg sm:text-xl font-semibold text-gray-700 whitespace-nowrap"> Upcoming Events </h2> <div className="flex items-center gap-1 sm:gap-2 flex-wrap"> <span className="text-xs text-gray-500">Next:</span> {[3, 7, 14].map(dayOption => ( <button key={dayOption} onClick={() => setUpcomingDays(dayOption)} disabled={isLoadingUpcoming} className={`px-2 py-0.5 text-xs rounded ${upcomingDays === dayOption ? 'bg-red-600 text-white font-semibold shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} disabled:opacity-50 transition-colors duration-150`}> {dayOption}d </button> ))} <Link to="/admin/schedule-viewer" className="text-sm font-medium text-red-600 hover:text-red-800 hover:underline ml-1 sm:ml-2 whitespace-nowrap"> Full Schedule → </Link> </div> </div> <div className="flex-grow overflow-hidden relative"> {isLoadingUpcoming && (<div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50 z-10"><p>Loading...</p></div>)} {upcomingError && !isLoadingUpcoming && (<div className="absolute inset-0 flex items-center justify-center p-4"><p>Error: {upcomingError}</p></div>)} {!isLoadingUpcoming && !upcomingError && upcomingBookings.length === 0 && (<div className="absolute inset-0 flex items-center justify-center"><p>No upcoming events.</p></div>)} <ul className="divide-y divide-gray-100 h-full overflow-y-auto pr-1"> {!isLoadingUpcoming && !upcomingError && upcomingBookings.map(booking => ( <li key={booking._id} className="py-2.5 px-1"> <div className="flex items-start justify-between gap-2"> <div className="flex-1 min-w-0"> <p className="text-sm font-medium text-gray-800 truncate" title={booking.eventName}> {booking.eventName || 'N/A Event'} </p> <p className="text-xs text-gray-500 truncate" title={`In: ${booking.auditorium?.name || 'N/A'} | Dept: ${booking.department?.name || 'N/A'}`}> In: {booking.auditorium?.name || 'N/A'} | Dept: {booking.department?.name || 'N/A'} </p> </div> <div className="text-xs text-gray-600 flex-shrink-0 text-right space-y-0.5"> <p className="font-medium">{formatRelativeDate(booking.startTime)}</p> <p className="text-gray-500"> {format(parseISO(booking.startTime), 'h:mm a')} - {format(parseISO(booking.endTime), 'h:mm a')} </p> </div> </div> </li> ))} </ul> </div> </div>
            </div>
            {/* Row 3: Overall Request Trends */}
            <div>
              <TrendChart title="Overall Request Trends" data={bookingTrends} isLoading={isLoadingTrends} error={trendsError} xAxisDataKey="date" lineDataKey="count" lineColor="#8884d8" emptyMessage={`No request data found for the last ${trendsDays} days.`} periodButtons={true} currentPeriod={trendsDays} onPeriodChange={setTrendsDays} />
            </div>
            {/* Row 4: Specific Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* Auditorium Trends */}
              <TrendChart title="Auditorium Request Trends" data={audiTrendData} isLoading={isLoadingAudiTrends || isLoadingDropdowns} error={audiTrendsError || (dropdownError.includes('Auditoriums') ? 'Failed to load auditoriums' : '')} xAxisDataKey="date" lineDataKey="count" lineColor="#82ca9d" emptyMessage={selectedAudiId === '' ? "Select an auditorium" : `No request data found.`} periodButtons={true} currentPeriod={audiTrendsDays} onPeriodChange={setAudiTrendsDays} selector={ <select value={selectedAudiId} onChange={(e) => setSelectedAudiId(e.target.value)} className="p-2 px-3 rounded-md border border-gray-300 shadow-sm w-full text-sm focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed" disabled={isLoadingDropdowns || auditoriums.length === 0} aria-label="Select Auditorium for Trends"> <option value="">-- Select Auditorium --</option> {isLoadingDropdowns && <option disabled>Loading...</option>} {!isLoadingDropdowns && auditoriums.map(a => ( <option key={a._id} value={a._id}>{a.name}</option> ))} </select> } />
              {/* Department Trends */}
              <TrendChart title="Department Request Trends" data={deptTrendData} isLoading={isLoadingDeptTrends || isLoadingDropdowns} error={deptTrendsError || (dropdownError.includes('Departments') ? 'Failed to load departments' : '')} xAxisDataKey="date" lineDataKey="count" lineColor="#ffc658" emptyMessage={selectedDeptId === '' ? "Select a department" : `No request data found.`} periodButtons={true} currentPeriod={deptTrendsDays} onPeriodChange={setDeptTrendsDays} selector={ <select value={selectedDeptId} onChange={(e) => setSelectedDeptId(e.target.value)} className="p-2 px-3 rounded-md border border-gray-300 shadow-sm w-full text-sm focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed" disabled={isLoadingDropdowns || departments.length === 0} aria-label="Select Department for Trends"> <option value="">-- Select Department --</option> {isLoadingDropdowns && <option disabled>Loading...</option>} {!isLoadingDropdowns && departments.map(d => ( <option key={d._id} value={d._id}>{d.name}</option> ))} </select> } />
            </div>
          </div>
        )} {/* End Conditional Render for Access Denied */}

      </div> {/* End Page Container */}


      {/* --- NEW: Action Required Modal --- */}
      <AnimatePresence>
        {isActionModalOpen && actionRequiredBookings.length > 0 && (
          <motion.div
            key="action-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsActionModalOpen(false)} // Close on backdrop click
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white w-full max-w-2xl rounded-xl shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
            >
              {/* Modal Header */}
              <div className="bg-yellow-100 p-4 border-b border-yellow-300 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <svg className="w-6 h-6 text-yellow-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                   <h2 className="text-lg font-semibold text-yellow-800">Pending Requests Need Action Soon</h2>
                </div>
                <button
                  onClick={() => setIsActionModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors"
                  aria-label="Close modal"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 max-h-[60vh] overflow-y-auto">
                {isLoadingModalData && <p className="text-center text-gray-500">Loading requests...</p>}
                {modalError && <p className="text-center text-red-600">Error: {modalError}</p>}
                {!isLoadingModalData && !modalError && (
                  <ul className="space-y-3">
                    {actionRequiredBookings.map(booking => (
                      <li key={booking._id} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 flex flex-col sm:flex-row justify-between items-start gap-3">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{booking.eventName}</p>
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">When:</span> {format(parseISO(booking.startTime), 'MMM d, h:mm a')} - {format(parseISO(booking.endTime), 'h:mm a')} ({formatRelativeDate(booking.startTime)})
                          </p>
                          <p className="text-xs text-gray-500">
                            <span className="font-medium">Where:</span> {booking.auditorium?.name || 'N/A'} | <span className="font-medium">By:</span> {booking.user?.username || 'N/A'} | <span className="font-medium">Dept:</span> {booking.department?.name || 'N/A'}
                          </p>
                        </div>
                        <Link
                          to="/manage-bookings" // Link to the general management page
                          onClick={() => setIsActionModalOpen(false)} // Close modal on click
                          className="mt-2 sm:mt-0 flex-shrink-0 px-3 py-1 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                        >
                          View →
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 p-4 border-t text-right">
                <button
                  onClick={() => setIsActionModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* --- END NEW MODAL --- */}

    </div> // End Root Container
  );
};

export default AdminDashboard;