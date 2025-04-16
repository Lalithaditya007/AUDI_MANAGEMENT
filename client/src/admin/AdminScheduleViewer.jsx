import React, { useState, useEffect, useCallback } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Base Calendar CSS
import './AdminScheduleViewer.css'; // Import Custom CSS (create this file)
import { format, startOfDay, endOfDay, parseISO, getMonth, getYear, addMonths, subMonths, isSameDay, isWithinInterval, isBefore, isAfter } from 'date-fns'; // Import required functions

function AdminScheduleViewer() {
    // --- Component State ---
    const [auditoriums, setAuditoriums] = useState([]);
    const [selectedAuditoriumId, setSelectedAuditoriumId] = useState('');
    const [currentMonthDate, setCurrentMonthDate] = useState(new Date());
    const [scheduleBookings, setScheduleBookings] = useState([]); // Bookings for the selected month
    const [selectedDate, setSelectedDate] = useState(null); // Clicked date
    const [selectedDateBookings, setSelectedDateBookings] = useState([]); // Filtered bookings for the clicked date
    const [isLoadingAudis, setIsLoadingAudis] = useState(false);
    const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
    const [fetchError, setFetchError] = useState(''); // General fetch error message

    // --- Fetch Auditoriums (Runs once) ---
    useEffect(() => {
        const fetchAudis = async () => { setIsLoadingAudis(true);setFetchError('');const url=`${import.meta.env.VITE_API_URL||'http://localhost:5001'}/api/auditoriums`; try{ const r=await fetch(url); const contentType=r.headers.get("content-type"); let d; if(contentType?.includes('application/json')){d=await r.json();} else{const txt=await r.text();throw new Error(`Server Error ${r.status}: ${txt.substring(0,100)}`);} if(!r.ok) throw new Error(d.message||'Fetch fail'); if(d.success&&Array.isArray(d.data)){ setAuditoriums(d.data); if(d.data.length>0&&!selectedAuditoriumId){ setSelectedAuditoriumId(d.data[0]._id); }} else throw new Error(d.message||'Invalid data'); } catch(e){ setFetchError(e.message||'Load audi err'); console.error("Audi Fetch Error:",e); } finally { setIsLoadingAudis(false); } };
        fetchAudis();
    }, []); // Empty dependency: Run once

    // --- Fetch Schedule When Auditorium or Month Changes ---
     const fetchSchedule = useCallback(async () => { if(!selectedAuditoriumId){setScheduleBookings([]); return;} setIsLoadingSchedule(true);setFetchError('');setSelectedDate(null);setSelectedDateBookings([]); const year=getYear(currentMonthDate); const month=getMonth(currentMonthDate)+1; const token=localStorage.getItem('authToken'); if(!token){setFetchError('Auth Error.'); setIsLoadingSchedule(false);return;} const apiUrl = `${import.meta.env.VITE_API_URL||'http://localhost:5001'}/api/bookings/schedule/${selectedAuditoriumId}?year=${year}&month=${month}`; console.log(`Fetching Schedule: ${apiUrl}`); try{ const r=await fetch(apiUrl, {headers:{"Authorization":`Bearer ${token}`,"Accept":"application/json"}}); const contentType=r.headers.get("content-type"); let d; if(contentType?.includes('application/json')){d=await r.json();}else{const txt=await r.text();throw new Error(`Server Error ${r.status}: ${txt.substring(0,100)}`);} if(!r.ok) throw new Error(d.message||`Schedule fetch fail:${r.status}`); if(d.success&&Array.isArray(d.data)) setScheduleBookings(d.data); else throw new Error(d.message||'Invalid schedule data'); } catch (e) { console.error("Schedule Fetch Error:",e); setFetchError(e.message || 'Load schedule err'); setScheduleBookings([]);} finally { setIsLoadingSchedule(false); } }, [selectedAuditoriumId, currentMonthDate]); // Dependencies
     useEffect(() => { fetchSchedule(); }, [fetchSchedule]); // Call fetchSchedule when it changes

    // --- Filter Bookings For Selected Date ---
    useEffect(() => { if (!selectedDate||scheduleBookings.length===0){setSelectedDateBookings([]); return;} const dayStart=startOfDay(selectedDate); const dayEnd=endOfDay(selectedDate); const bookings=scheduleBookings.filter(b => {try{ const s=parseISO(b.startTime),e=parseISO(b.endTime); return s<dayEnd && e>dayStart;}catch{return false;}}); setSelectedDateBookings(bookings.sort((a,b)=>parseISO(a.startTime)-parseISO(b.startTime)));}, [selectedDate, scheduleBookings]);


    // --- Event Handlers ---
    const handleAuditoriumChange = (e) => { setSelectedAuditoriumId(e.target.value); };
    const changeMonth = (direction) => { if(direction==='prev'){setCurrentMonthDate(subMonths(currentMonthDate, 1));}else{setCurrentMonthDate(addMonths(currentMonthDate, 1));} };
    const handleDateClick = (date) => { console.log("Date clicked:", date); setSelectedDate(date); };


    // --- Calendar Tile Styling Logic ---
    // Helper to classify a date's role within bookings
    const getBookingInfoForDate = useCallback((date, bookings) => {
        const dayStart = startOfDay(date); const dayEnd = endOfDay(date); let info = { isStart: false, isEnd: false, isMiddle: false, isSingle: false, count: 0 };
        for (const b of bookings) {
            try {
                const bookingStart = parseISO(b.startTime); const bookingEnd = parseISO(b.endTime);
                const effectiveEnd = new Date(bookingEnd.getTime() - ( (bookingEnd.getHours()===0 && bookingEnd.getMinutes()===0 && bookingEnd.getSeconds()===0) ? 1 : 0) ); // Adjust midnight end times
                const bookingStartDay = startOfDay(bookingStart); const bookingEndDay = startOfDay(effectiveEnd);

                if (bookingStart < dayEnd && bookingEnd > dayStart) { // Check overlap
                    info.count++;
                    const starts = isSameDay(dayStart, bookingStartDay); const ends = isSameDay(dayStart, bookingEndDay);
                    if (starts && ends) { info.isSingle = true; }
                    else if (starts) { info.isStart = true; }
                    else if (ends) { info.isEnd = true; }
                    else { info.isMiddle = true; }
                }
            } catch (e) { console.error("Date parse err in tile", e); }
        } return info;
    }, []); // Depends only on input, no component state needed

    // Generate CSS classes for each tile
    const tileClassName = useCallback(({date, view}) => {
        if (view === 'month') {
            const info = getBookingInfoForDate(date, scheduleBookings); // Pass component state
            let classes = [];
            if (info.count > 0) {
                if(info.isSingle) classes.push('booking-single-day');
                // Handle multi-day (prioritize start/end visual)
                if(info.isStart) classes.push('booking-start');
                if(info.isEnd) classes.push('booking-end');
                // Only apply middle if NOT start or end for cleaner visuals
                if(info.isMiddle && !info.isStart && !info.isEnd) classes.push('booking-middle');
                 classes.push('has-booking'); // Generic class for any booking day
            }
            if (selectedDate && isSameDay(date, selectedDate)) { classes.push('selected-day'); } // Highlight clicked day
            return classes.join(' ');
        } return null;
    }, [scheduleBookings, selectedDate, getBookingInfoForDate]); // Recalculate if schedule or selected date changes


    // --- Render ---
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-4 md:p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 sm:mb-0">
                        Auditorium Schedule
                    </h1>
                    
                    {/* Auditorium Selector */}
                    <div className="w-full sm:w-72">
                        <select 
                            value={selectedAuditoriumId}
                            onChange={handleAuditoriumChange}
                            disabled={isLoadingAudis || isLoadingSchedule}
                            className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <option value="" disabled={!!selectedAuditoriumId}>
                                {isLoadingAudis ? 'Loading auditoriums...' : '-- Select Auditorium --'}
                            </option>
                            {auditoriums.map(a => (
                                <option key={a._id} value={a._id}>
                                    {a.name}{a.location ? ` (${a.location})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Error Message */}
                {fetchError && (
                    <div className="mb-6 p-3 text-sm text-red-800 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                        {fetchError}
                    </div>
                )}

                {/* Month Navigator */}
                <div className="bg-white rounded-lg shadow-sm mb-6 p-4 sticky top-4 z-20 backdrop-blur-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => changeMonth('prev')}
                            className="p-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            disabled={isLoadingSchedule}
                        >
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <h2 className="text-lg font-semibold text-gray-800">
                            {format(currentMonthDate, 'MMMM yyyy')}
                        </h2>
                        <button
                            onClick={() => changeMonth('next')}
                            className="p-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            disabled={isLoadingSchedule}
                        >
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Calendar Section */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-lg shadow-sm p-4 overflow-hidden">
                            {isLoadingSchedule && (
                                <div className="min-h-[400px] flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
                                </div>
                            )}
                            {!isLoadingSchedule && selectedAuditoriumId && (
                                <Calendar
                                    value={currentMonthDate}
                                    onClickDay={handleDateClick}
                                    onActiveStartDateChange={({ activeStartDate }) => setCurrentMonthDate(activeStartDate)}
                                    tileClassName={tileClassName}
                                    className="react-calendar-custom"
                                    showNeighboringMonth={false}
                                />
                            )}
                            {!selectedAuditoriumId && (
                                <div className="min-h-[400px] flex items-center justify-center text-gray-500">
                                    Please select an auditorium to view its schedule
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Events List Section */}
                    <div className="bg-white rounded-lg shadow-sm p-4 min-h-[400px]">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">
                            {selectedDate ? format(selectedDate, 'EEEE, MMMM d') : 'Select a Date'}
                        </h3>
                        
                        {isLoadingSchedule && (
                            <div className="flex items-center justify-center h-32">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500"></div>
                            </div>
                        )}
                        
                        {!isLoadingSchedule && selectedDate && selectedDateBookings.length === 0 && (
                            <p className="text-sm text-gray-500 italic text-center">
                                No events scheduled for this date
                            </p>
                        )}
                        
                        {!isLoadingSchedule && selectedDateBookings.length > 0 && (
                            <ul className="space-y-3 overflow-y-auto max-h-[calc(100vh-300px)]">
                                {selectedDateBookings.map(booking => (
                                    <li key={booking._id} 
                                        className="p-3 bg-gradient-to-r from-red-50 to-white border border-red-100 rounded-lg hover:shadow-sm transition-shadow">
                                        <p className="font-medium text-gray-900 truncate">
                                            {booking.eventName || 'Untitled Event'}
                                        </p>
                                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                                            <p className="flex items-center">
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                {format(parseISO(booking.startTime), 'h:mm a')} - {format(parseISO(booking.endTime), 'h:mm a')}
                                            </p>
                                            {booking.user && (
                                                <p className="flex items-center text-gray-500">
                                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                    </svg>
                                                    {booking.user.username || booking.user.email || 'N/A'}
                                                </p>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminScheduleViewer;