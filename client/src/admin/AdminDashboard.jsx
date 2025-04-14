import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from 'react-router-dom';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import {
  PieChart, Pie, Cell, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
} from "recharts";

// --- Helper Components ---

/**
 * Simple card component to display a statistic.
 */
function StatsCard({ title, value, color = "text-gray-900" }) {
  const isLoadingValue = value === '...' || value === undefined || value === null;
  // Truncate long string values for display
  const displayValue = isLoadingValue
    ? '...'
    : (typeof value === 'string' && value.length > 20 ? `${value.substring(0, 18)}...` : value);

  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow hover:shadow-lg transition-shadow duration-200 ease-in-out">
      <h3
        className="text-base sm:text-lg font-semibold text-gray-500 mb-1 truncate"
        title={title} // Show full title on hover
      >
        {title}
      </h3>
      <p className={`text-3xl font-bold ${color} ${isLoadingValue ? 'animate-pulse' : ''}`}>
        {displayValue}
      </p>
    </div>
  );
}

/**
 * Reusable Line Chart component for displaying trends.
 */
const TrendChart = ({
  title,
  data,
  isLoading,
  error,
  xAxisDataKey,
  lineDataKey,
  lineColor,
  yAxisLabel,
  emptyMessage,
  periodButtons,
  currentPeriod,
  onPeriodChange,
  selector,
}) => {
  const formatTrendDateTick = (tickItem) => {
    try {
      return format(parseISO(tickItem), 'MMM d'); // Format date ticks (e.g., "Oct 26")
    } catch {
      return tickItem; // Fallback if parsing fails
    }
  };

  const chartMinHeight = 350; // Minimum height for the chart container area
  const containerMinHeight = 450; // Minimum height for the entire card

  return (
    <div className={`bg-white p-4 sm:p-6 rounded-lg shadow min-h-[${containerMinHeight}px] flex flex-col`}>
      {/* Card Header */}
      <div className="flex justify-between items-start mb-4 flex-shrink-0 flex-wrap gap-2">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-700 whitespace-nowrap mr-4">
          {title}
        </h2>
        <div className="flex items-center gap-4 flex-wrap">
          {/* Optional Selector (e.g., dropdown) */}
          {selector && (
            <div className="flex-1 min-w-[180px]">
              {selector}
            </div>
          )}
          {/* Optional Period Buttons */}
          {periodButtons && (
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap flex-shrink-0">
              <span className="text-xs text-gray-500">Period:</span>
              {[7, 30, 90].map(dayOption => (
                <button
                  key={dayOption}
                  onClick={() => onPeriodChange(dayOption)}
                  disabled={isLoading}
                  className={`px-2 py-0.5 text-xs rounded ${currentPeriod === dayOption
                    ? 'bg-red-600 text-white font-semibold shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } disabled:opacity-50 transition-colors duration-150`}
                >
                  {dayOption}d
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chart Area */}
      <div className="flex-grow flex items-center justify-center relative min-h-[300px]">
        {/* Loading State */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50 z-10">
            <p className="text-sm text-gray-500 animate-pulse">Loading chart...</p>
          </div>
        )}
        {/* Error State */}
        {error && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <p className="text-sm text-red-500 px-4 text-center">Error: {error}</p>
          </div>
        )}
        {/* Empty State */}
        {!isLoading && !error && (!data || data.length === 0) && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <p className="text-sm text-gray-500 italic">{emptyMessage || 'No data available.'}</p>
          </div>
        )}
        {/* Chart */}
        {!isLoading && !error && data && data.length > 0 && (
          <ResponsiveContainer width="99%" height={chartMinHeight}>
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 30, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis
                dataKey={xAxisDataKey}
                tickFormatter={formatTrendDateTick}
                tick={{ fontSize: 10 }}
                interval="preserveStartEnd" // Adjust interval logic if needed
                dy={10} // Offset tick down
                angle={-10} // Slight angle for readability
                textAnchor="end"
              />
              <YAxis
                allowDecimals={false} // No decimal counts
                tick={{ fontSize: 11 }}
                width={30}
                label={yAxisLabel
                  ? {
                    value: yAxisLabel,
                    angle: -90,
                    position: 'insideLeft',
                    style: { fontSize: '10px', textAnchor: 'middle' },
                    dy: -10
                  }
                  : undefined}
              />
              <Tooltip
                formatter={(value) => [value?.toLocaleString() ?? '0', 'Count']} // Format tooltip value
                labelFormatter={(label) => {
                  try { return format(parseISO(label), 'EEE, MMM d, yyyy'); } // Format tooltip label date
                  catch { return label; }
                }}
              />
              <Legend verticalAlign="top" height={30} />
              <Line
                type="monotone"
                dataKey={lineDataKey}
                name="Requests" // Legend name
                stroke={lineColor || "#8884d8"}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div> {/* End Chart Area */}
    </div>
  );
};


// --- Main AdminDashboard Component ---

const AdminDashboard = () => {
  // --- State Definitions ---
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState("");

  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [isLoadingUpcoming, setIsLoadingUpcoming] = useState(true);
  const [upcomingError, setUpcomingError] = useState("");
  const [upcomingDays, setUpcomingDays] = useState(7); // Default lookahead for upcoming

  const [auditoriums, setAuditoriums] = useState([]); // For dropdowns
  const [departments, setDepartments] = useState([]); // For dropdowns
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(true);
  const [dropdownError, setDropdownError] = useState(""); // Combined error for dropdowns

  const [bookingTrends, setBookingTrends] = useState([]); // Overall trends
  const [isLoadingTrends, setIsLoadingTrends] = useState(true);
  const [trendsError, setTrendsError] = useState("");
  const [trendsDays, setTrendsDays] = useState(30); // Default lookback for overall trends

  const [selectedAudiId, setSelectedAudiId] = useState('all'); // Specific trend filters
  const [audiTrendData, setAudiTrendData] = useState([]);
  const [isLoadingAudiTrends, setIsLoadingAudiTrends] = useState(false); // Initially false, true when fetching
  const [audiTrendsError, setAudiTrendsError] = useState("");
  const [audiTrendsDays, setAudiTrendsDays] = useState(30); // Lookback for auditorium trends

  const [selectedDeptId, setSelectedDeptId] = useState('all');
  const [deptTrendData, setDeptTrendData] = useState([]);
  const [isLoadingDeptTrends, setIsLoadingDeptTrends] = useState(false); // Initially false
  const [deptTrendsError, setDeptTrendsError] = useState("");
  const [deptTrendsDays, setDeptTrendsDays] = useState(30); // Lookback for department trends

  // --- API Fetching Helper ---
  const fetchData = useCallback(async (url, token, signal) => {
    console.log(`[API Call] Fetching from ${url}`);
    try {
      const response = await fetch(url, {
        signal,
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
        // Handle non-JSON responses (e.g., plain text errors)
        const text = await response.text();
        if (!response.ok) {
          // Attempt to provide a snippet of the error text
          throw new Error(`Server Error ${response.status}: ${text.substring(0, 150)}...`);
        } else {
          // Success response but not JSON? Log warning, return null.
          console.warn(`[API Warning] Received non-JSON success response from ${url}`);
          return null;
        }
      }

      if (!response.ok) {
        throw new Error(data.message || `Fetch failed: ${response.status}`);
      }

      // Ensure the expected structure (success: true, data: ...)
      if (data.success && data.hasOwnProperty('data')) {
        console.log(`[API Response] Success from ${url}`);
        return data.data;
      } else {
        // Handle cases where success might be true but data is missing, or success is false
        throw new Error(data.message || "Invalid data structure received.");
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Fetch aborted:', url);
        return undefined; // Explicitly return undefined on abort to differentiate from null/error
      } else {
        console.error(`[Fetch Error] from ${url}:`, error);
        throw error; // Re-throw other errors to be caught by callers
      }
    }
  }, []); // Empty dependency array: useCallback creates a stable function reference

  // --- UseEffect Hooks for Data Fetching ---

  // Effect 1: Fetch Initial Dashboard Data (Stats, Upcoming, Dropdowns, Overall Trends)
  useEffect(() => {
    const abortController = new AbortController();
    const token = localStorage.getItem("authToken");
    const userRole = localStorage.getItem("userRole");

    if (!token || userRole !== "admin") {
      setStatsError("Access Denied."); // Specific error for auth failure
      setIsLoadingStats(false);
      setIsLoadingUpcoming(false);
      setIsLoadingDropdowns(false);
      setIsLoadingTrends(false);
      return; // Stop execution if not authorized
    }

    const fetchInitialData = async () => {
      // Reset errors and set loading states
      setStatsError('');
      setUpcomingError('');
      setDropdownError('');
      setTrendsError('');
      setIsLoadingStats(true);
      setIsLoadingUpcoming(true);
      setIsLoadingDropdowns(true);
      setIsLoadingTrends(true);

      const apiUrlBase = import.meta.env.VITE_API_URL || "http://localhost:5001";
      const statsUrl = `${apiUrlBase}/api/bookings/admin/stats`;
      const upcomingUrl = `${apiUrlBase}/api/bookings/admin/upcoming?days=${upcomingDays}`;
      const audiUrl = `${apiUrlBase}/api/auditoriums`;
      const deptUrl = `${apiUrlBase}/api/departments`;
      const trendsUrl = `${apiUrlBase}/api/bookings/admin/trends?days=${trendsDays}`;

      try {
        // Use Promise.allSettled or individual catches for better error isolation
        const [statsResult, upcomingResult, audiResult, deptResult, trendsResult] = await Promise.allSettled([
          fetchData(statsUrl, token, abortController.signal),
          fetchData(upcomingUrl, token, abortController.signal),
          fetchData(audiUrl, token, abortController.signal),
          fetchData(deptUrl, token, abortController.signal),
          fetchData(trendsUrl, token, abortController.signal)
        ]);

        // Process Stats
        if (statsResult.status === 'fulfilled' && statsResult.value) {
          setStats({
            total: statsResult.value.total ?? 0,
            pending: statsResult.value.pending ?? 0,
            approved: statsResult.value.approved ?? 0,
            rejected: statsResult.value.rejected ?? 0,
          });
        } else if (statsResult.status === 'rejected') {
          setStatsError(statsResult.reason.message || 'Failed to load stats');
        }

        // Process Upcoming Bookings
        if (upcomingResult.status === 'fulfilled' && Array.isArray(upcomingResult.value)) {
          setUpcomingBookings(upcomingResult.value);
        } else if (upcomingResult.status === 'rejected') {
          setUpcomingError(upcomingResult.reason.message || 'Failed to load upcoming events');
        }

        // Process Auditoriums (for dropdown)
        if (audiResult.status === 'fulfilled' && Array.isArray(audiResult.value)) {
          setAuditoriums(audiResult.value);
        } else if (audiResult.status === 'rejected') {
          setDropdownError(prev => prev + 'Auditoriums Failed. ');
        }

        // Process Departments (for dropdown)
        if (deptResult.status === 'fulfilled' && Array.isArray(deptResult.value)) {
          setDepartments(deptResult.value);
        } else if (deptResult.status === 'rejected') {
          setDropdownError(prev => prev + 'Departments Failed. ');
        }

        // Process Overall Trends
        if (trendsResult.status === 'fulfilled' && Array.isArray(trendsResult.value)) {
          setBookingTrends(trendsResult.value);
        } else if (trendsResult.status === 'rejected') {
          setTrendsError(trendsResult.reason.message || 'Failed to load overall trends');
        }

      } catch (error) {
        // This catch block might not be strictly necessary with Promise.allSettled
        // unless there's an error outside the promises themselves.
        if (error.name !== 'AbortError') {
          console.error("Unexpected error during initial data fetch:", error);
          // Set a generic error if specific ones weren't caught
          if (!statsError && !upcomingError && !dropdownError && !trendsError) {
            setStatsError("Failed to load dashboard data.");
          }
        }
      } finally {
        // Ensure loading states are turned off only if the effect wasn't aborted
        if (!abortController.signal.aborted) {
          setIsLoadingStats(false);
          setIsLoadingUpcoming(false);
          setIsLoadingDropdowns(false);
          setIsLoadingTrends(false);
        }
      }
    };

    fetchInitialData();

    // Cleanup function to abort fetch on component unmount or dependency change
    return () => abortController.abort();

  }, [fetchData, upcomingDays, trendsDays]); // Dependencies: Re-run if these change


  // Effect 2: Fetch Auditorium Specific Trends
  useEffect(() => {
    // Don't fetch if 'all' is selected or not logged in as admin
    if (selectedAudiId === 'all') {
      setAudiTrendData([]); // Clear data if switching back to 'all'
      setIsLoadingAudiTrends(false);
      setAudiTrendsError("");
      return;
    }

    const abortController = new AbortController();
    const token = localStorage.getItem("authToken");
    const userRole = localStorage.getItem("userRole");

    if (!token || userRole !== "admin") {
      setIsLoadingAudiTrends(false);
      setAudiTrendsError("Access Denied.");
      return;
    }

    const fetchAudiTrendData = async () => {
      setIsLoadingAudiTrends(true);
      setAudiTrendsError("");
      const apiUrl = `${import.meta.env.VITE_API_URL || "http://localhost:5001"}/api/bookings/admin/trends?days=${audiTrendsDays}&auditoriumId=${selectedAudiId}`;

      try {
        const data = await fetchData(apiUrl, token, abortController.signal);
        // Check if fetch wasn't aborted and data is valid array
        if (data !== undefined && Array.isArray(data)) {
          setAudiTrendData(data);
        } else if (data !== undefined) { // data received but not array
          throw new Error("Invalid format received for auditorium trends.");
        }
        // If data is undefined, it means fetch was aborted, do nothing here.
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error(`Error fetching trends for auditorium ${selectedAudiId}:`, err);
          setAudiTrendsError(err.message || "Could not load trends for this auditorium.");
          setAudiTrendData([]); // Clear data on error
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoadingAudiTrends(false);
        }
      }
    };

    fetchAudiTrendData();

    return () => abortController.abort();

  }, [fetchData, selectedAudiId, audiTrendsDays]); // Dependencies


  // Effect 3: Fetch Department Specific Trends
  useEffect(() => {
    if (selectedDeptId === 'all') {
      setDeptTrendData([]);
      setIsLoadingDeptTrends(false);
      setDeptTrendsError("");
      return;
    }

    const abortController = new AbortController();
    const token = localStorage.getItem("authToken");
    const userRole = localStorage.getItem("userRole");

    if (!token || userRole !== "admin") {
      setIsLoadingDeptTrends(false);
      setDeptTrendsError("Access Denied.");
      return;
    }

    const fetchDeptTrendData = async () => {
      setIsLoadingDeptTrends(true);
      setDeptTrendsError("");
      const apiUrl = `${import.meta.env.VITE_API_URL || "http://localhost:5001"}/api/bookings/admin/trends?days=${deptTrendsDays}&departmentId=${selectedDeptId}`;

      try {
        const data = await fetchData(apiUrl, token, abortController.signal);
        if (data !== undefined && Array.isArray(data)) {
          setDeptTrendData(data);
        } else if (data !== undefined) {
          throw new Error("Invalid format received for department trends.");
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error(`Error fetching trends for department ${selectedDeptId}:`, err);
          setDeptTrendsError(err.message || "Could not load trends for this department.");
          setDeptTrendData([]);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsLoadingDeptTrends(false);
        }
      }
    };

    fetchDeptTrendData();

    return () => abortController.abort();

  }, [fetchData, selectedDeptId, deptTrendsDays]); // Dependencies


  // --- Chart Data Preparation ---
  const PIE_COLORS = ["#FACC15", "#22C55E", "#EF4444"]; // Yellow (Pending), Green (Approved), Red (Rejected)
  const pieData = useMemo(() => [
    { name: "Pending", value: stats.pending, color: PIE_COLORS[0] },
    { name: "Approved", value: stats.approved, color: PIE_COLORS[1] },
    { name: "Rejected", value: stats.rejected, color: PIE_COLORS[2] },
  ].filter(entry => entry.value > 0), // Filter out slices with zero value
    [stats.pending, stats.approved, stats.rejected] // Dependencies
  );


  // --- Derived State ---
  // Combined loading indicator for initial page load
  const showLoadingIndicator = isLoadingStats && isLoadingUpcoming && isLoadingDropdowns && isLoadingTrends;


  // --- Helper Function for Relative Time Display ---
  const formatRelativeDate = (isoDateString) => {
    if (!isoDateString) return 'N/A';
    try {
      const date = parseISO(isoDateString);
      if (isToday(date)) return 'Today';
      if (isTomorrow(date)) return 'Tomorrow';

      const now = new Date();
      // Calculate difference in days (ignoring time part)
      const dateStartOfDay = date.setHours(0, 0, 0, 0);
      const nowStartOfDay = now.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((dateStartOfDay - nowStartOfDay) / (1000 * 60 * 60 * 24));

      // Show weekday name if within the next 6 days (excluding today/tomorrow handled above)
      if (diffDays > 0 && diffDays <= 6) {
        return format(date, 'EEEE'); // e.g., "Monday"
      }
      // Otherwise, show abbreviated date
      return format(date, 'EEE, MMM d'); // e.g., "Mon, Oct 26"
    } catch (e) {
      console.error("Error formatting relative date:", e);
      return "Invalid Date";
    }
  };


  // --- Render Dashboard UI ---
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-900">
          Admin Dashboard
        </h1>

        {/* Initial Loading Indicator */}
        {showLoadingIndicator && (
          <div className="text-center py-10">
            <p className="text-lg text-gray-500 animate-pulse">Loading dashboard...</p>
          </div>
        )}

        {/* Access Denied Message */}
        {statsError === "Access Denied." && (
          <div
            className="mb-6 p-4 text-center text-red-700 bg-red-100 rounded border border-red-200"
            role="alert"
          >
            <p><strong>Access Denied:</strong> Admin privileges required.</p>
          </div>
        )}

        {/* Generic Stats Error Message (only if not Access Denied and not initial loading) */}
        {statsError && statsError !== "Access Denied." && !showLoadingIndicator && (
          <div
            className="mb-6 p-4 text-center text-red-700 bg-red-100 rounded border border-red-200"
            role="alert"
          >
            <p><strong>Error loading stats:</strong> {statsError}</p>
          </div>
        )}

        {/* Render Main Content only if access is allowed */}
        {statsError !== "Access Denied." && (
          <div className="space-y-8">

            {/* --- Row 1: Stats Cards --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <StatsCard
                title="Total Requests"
                value={isLoadingStats ? '...' : stats.total}
                color="text-purple-600"
              />
              <StatsCard
                title="Pending"
                value={isLoadingStats ? '...' : stats.pending}
                color="text-yellow-500"
              />
              <StatsCard
                title="Approved"
                value={isLoadingStats ? '...' : stats.approved}
                color="text-green-500"
              />
              <StatsCard
                title="Rejected"
                value={isLoadingStats ? '...' : stats.rejected}
                color="text-red-500"
              />
            </div>

            {/* --- Row 2: Pie Chart & Upcoming Events --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* Pie Chart Section */}
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow min-h-[400px] flex flex-col">
                <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-700 flex-shrink-0">
                  Request Distribution
                </h2>
                <div className="flex-grow flex items-center justify-center">
                  {isLoadingStats && (
                    <p className="text-sm text-gray-500 animate-pulse">Loading chart...</p>
                  )}
                  {statsError && !isLoadingStats && (
                    <p className="text-sm text-red-500 italic px-4 text-center">Error loading stats</p>
                  )}
                  {!isLoadingStats && !statsError && pieData.length === 0 && (
                    <p className="text-sm text-gray-500 italic">No request data</p>
                  )}
                  {!isLoadingStats && !statsError && pieData.length > 0 && (
                    <ResponsiveContainer width="99%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          innerRadius={50} // Donut chart
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} // Custom label
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => value?.toLocaleString() ?? ''} />
                        <Legend iconSize={10} verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Upcoming Events Section */}
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow h-[400px] flex flex-col">
                <div className="flex justify-between items-center mb-4 flex-shrink-0 flex-wrap gap-2">
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-700 whitespace-nowrap">
                    Upcoming Events
                  </h2>
                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    <span className="text-xs text-gray-500">Next:</span>
                    {[3, 7, 14].map(dayOption => (
                      <button
                        key={dayOption}
                        onClick={() => setUpcomingDays(dayOption)}
                        disabled={isLoadingUpcoming}
                        className={`px-2 py-0.5 text-xs rounded ${upcomingDays === dayOption
                          ? 'bg-red-600 text-white font-semibold shadow-sm'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          } disabled:opacity-50 transition-colors duration-150`}
                      >
                        {dayOption}d
                      </button>
                    ))}
                    <Link
                      to="/admin/schedule-viewer"
                      className="text-sm font-medium text-red-600 hover:text-red-800 hover:underline ml-1 sm:ml-2 whitespace-nowrap"
                    >
                      Full Schedule →
                    </Link>
                  </div>
                </div>
                <div className="flex-grow overflow-hidden relative">
                  {isLoadingUpcoming && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50 z-10">
                      <p className="text-sm text-gray-500 animate-pulse">Loading...</p>
                    </div>
                  )}
                  {upcomingError && !isLoadingUpcoming && (
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                      <p className="text-sm text-red-500 px-4 text-center">Error: {upcomingError}</p>
                    </div>
                  )}
                  {!isLoadingUpcoming && !upcomingError && upcomingBookings.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-sm text-gray-500 italic">No upcoming events in the next {upcomingDays} days.</p>
                    </div>
                  )}
                  <ul className="divide-y divide-gray-100 h-full overflow-y-auto pr-1">
                    {!isLoadingUpcoming && !upcomingError && upcomingBookings.map(booking => (
                      <li key={booking._id} className="py-2.5 px-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-sm font-medium text-gray-800 truncate"
                              title={booking.eventName}
                            >
                              {booking.eventName || 'N/A Event'}
                            </p>
                            <p
                              className="text-xs text-gray-500 truncate"
                              title={`In: ${booking.auditorium?.name || 'N/A Audi'} | Dept: ${booking.department?.name || 'N/A Dept'}`}
                            >
                              In: {booking.auditorium?.name || 'N/A'} | Dept: {booking.department?.name || 'N/A'}
                            </p>
                          </div>
                          <div className="text-xs text-gray-600 flex-shrink-0 text-right space-y-0.5">
                            <p className="font-medium">{formatRelativeDate(booking.startTime)}</p>
                            <p className="text-gray-500">
                              {format(parseISO(booking.startTime), 'h:mm a')} - {format(parseISO(booking.endTime), 'h:mm a')}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div> {/* End Upcoming Section */}
            </div> {/* End Row 2 Grid */}

            {/* --- Row 3: Overall Request Trends --- */}
            <div>
              <TrendChart
                title="Overall Request Trends"
                data={bookingTrends}
                isLoading={isLoadingTrends}
                error={trendsError}
                xAxisDataKey="date"
                lineDataKey="count"
                lineColor="#8884d8" // Purple
                emptyMessage={`No request data found for the last ${trendsDays} days.`}
                periodButtons={true}
                currentPeriod={trendsDays}
                onPeriodChange={setTrendsDays}
              />
            </div>

            {/* --- Row 4: Specific Trends (Auditorium & Department) --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* Auditorium Trends */}
              <TrendChart
                title="Auditorium Request Trends"
                data={audiTrendData}
                isLoading={isLoadingAudiTrends || isLoadingDropdowns}
                error={audiTrendsError || (dropdownError.includes('Auditoriums') ? 'Failed to load auditoriums' : '')}
                xAxisDataKey="date"
                lineDataKey="count"
                lineColor="#82ca9d" // Green
                emptyMessage={selectedAudiId === 'all' ? "Select an auditorium to view trends" : `No request data found for this auditorium.`}
                periodButtons={true}
                currentPeriod={audiTrendsDays}
                onPeriodChange={setAudiTrendsDays}
                selector={
                  <select
                    value={selectedAudiId}
                    onChange={(e) => setSelectedAudiId(e.target.value)}
                    className="p-2 px-3 rounded-md border border-gray-300 shadow-sm w-full text-sm focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    disabled={isLoadingDropdowns || auditoriums.length === 0}
                    aria-label="Select Auditorium for Trends"
                  >
                    <option value="all">-- Select Auditorium --</option>
                    {isLoadingDropdowns && <option disabled>Loading...</option>}
                    {!isLoadingDropdowns && auditoriums.map(a => (
                      <option key={a._id} value={a._id}>{a.name}</option>
                    ))}
                  </select>
                }
              />
              {/* Department Trends */}
              <TrendChart
                title="Department Request Trends"
                data={deptTrendData}
                isLoading={isLoadingDeptTrends || isLoadingDropdowns}
                error={deptTrendsError || (dropdownError.includes('Departments') ? 'Failed to load departments' : '')}
                xAxisDataKey="date"
                lineDataKey="count"
                lineColor="#ffc658" // Orange/Yellow
                emptyMessage={selectedDeptId === 'all' ? "Select a department to view trends" : `No request data found for this department.`}
                periodButtons={true}
                currentPeriod={deptTrendsDays}
                onPeriodChange={setDeptTrendsDays}
                selector={
                  <select
                    value={selectedDeptId}
                    onChange={(e) => setSelectedDeptId(e.target.value)}
                    className="p-2 px-3 rounded-md border border-gray-300 shadow-sm w-full text-sm focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    disabled={isLoadingDropdowns || departments.length === 0}
                    aria-label="Select Department for Trends"
                  >
                    <option value="all">-- Select Department --</option>
                    {isLoadingDropdowns && <option disabled>Loading...</option>}
                    {!isLoadingDropdowns && departments.map(d => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                }
              />
            </div> {/* End Row 4 Grid */}

            {/* Optional: Add back links to manage bookings/auditoriums etc. here */}
            {/* <div className="mt-8 pt-6 border-t border-gray-200 flex flex-wrap gap-4">
              <Link to="/admin/manage-bookings" className="text-red-600 hover:text-red-800">Manage Bookings</Link>
              <Link to="/admin/manage-auditoriums" className="text-red-600 hover:text-red-800">Manage Auditoriums</Link>
            </div> */}

          </div> // End main content wrapper (space-y-8)
        )} {/* End Conditional Render for Access Denied */}

      </div> {/* End Page Container (max-w-7xl) */}
    </div> // End Root Container (min-h-screen)
  );
};

export default AdminDashboard;