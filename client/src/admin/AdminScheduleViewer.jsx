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
        <div className="p-4 md:p-8 max-w-7xl mx-auto"> {/* Increased max-width */}
            <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800">Auditorium Schedule</h1>
            {fetchError && <div className="mb-4 p-3 text-center text-sm text-red-800 bg-red-100 rounded border border-red-200">{fetchError}</div>}

            {/* --- Selection Bar --- */}
            <div className="mb-6 p-4 bg-white rounded-lg shadow-md flex flex-col sm:flex-row items-center gap-4 sticky top-4 z-10 backdrop-blur-sm bg-opacity-90"> {/* Added sticky */}
                 <div className="flex-1 w-full sm:min-w-[250px]">
                    <label htmlFor="auditorium-select" className="block text-sm font-medium text-gray-700 mb-1">Auditorium:</label>
                    <select id="auditorium-select" value={selectedAuditoriumId} onChange={handleAuditoriumChange} disabled={isLoadingAudis || isLoadingSchedule} className="w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed">
                        <option value="" disabled={!!selectedAuditoriumId}>{isLoadingAudis ? 'Loading...' : '-- Select Auditorium --'}</option>
                        {auditoriums.map(a => (<option key={a._id} value={a._id}>{a.name}{a.location ? ` (${a.location})` : ''}</option>))}
                    </select>
                 </div>
                 <div className="flex items-center gap-2 justify-center w-full sm:w-auto pt-2 sm:pt-0">
                    <button onClick={() => changeMonth('prev')} className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Previous month" disabled={isLoadingSchedule}>
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <span className="font-semibold text-lg text-gray-700 w-36 text-center tabular-nums"> {/* Fixed width for stability */}
                       {format(currentMonthDate, 'MMMM yyyy')}
                     </span>
                    <button onClick={() => changeMonth('next')} className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Next month" disabled={isLoadingSchedule}>
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                 </div>
             </div>

            {/* Calendar and Schedule Details Grid */}
             <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                {/* Calendar */}
                 <div className="lg:col-span-5 bg-white p-2 sm:p-4 rounded-lg shadow overflow-hidden">
                     {isLoadingSchedule && <div className="min-h-[350px] flex items-center justify-center"><p className="animate-pulse text-gray-500">Loading Schedule...</p></div>}
                     {!isLoadingSchedule && selectedAuditoriumId && (
                        <Calendar
                             value={currentMonthDate} // Keeps calendar showing selected month view
                             onClickDay={handleDateClick} // Action on clicking a day
                             onActiveStartDateChange={({ activeStartDate }) => setCurrentMonthDate(activeStartDate)} // Update state on internal navigation
                             tileClassName={tileClassName} // Custom CSS classes per day
                             className="react-calendar-custom" // Base class for custom CSS rules
                             showNeighboringMonth={false} // Simplify view to current month only
                         />
                      )}
                     {!selectedAuditoriumId && <div className="min-h-[350px] flex items-center justify-center"><p className="text-gray-500">Select an auditorium to view its schedule.</p></div>}
                 </div>

                 {/* Schedule List for Selected Date */}
                 <div className="lg:col-span-2 bg-white border border-gray-200 p-4 rounded-lg shadow min-h-[400px]"> {/* Changed bg, added border */}
                     <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">
                        {selectedDate ? `Schedule for ${format(selectedDate, 'EEE, MMM d')}` : 'Select a Date'}
                     </h3>
                     {isLoadingSchedule && <p className="text-sm text-gray-500">Loading...</p>}
                     {!isLoadingSchedule && selectedDate && selectedDateBookings.length === 0 && (<p className="text-sm text-gray-500 italic">No bookings scheduled for this date.</p>)}
                     {!isLoadingSchedule && selectedDateBookings.length > 0 && (
                         <ul className="space-y-3 overflow-y-auto max-h-[calc(100% - 60px)]"> {/* Adjusted max-h */}
                             {selectedDateBookings.map(booking => (
                                 <li key={booking._id} className="p-2.5 bg-red-50 border border-red-100 rounded-md"> {/* Changed bg */}
                                     <p className="font-medium text-sm text-red-800 truncate">{booking.eventName || 'Untitled Event'}</p>
                                      <div className="text-xs text-red-700 mt-0.5"> {/* Consistent color */}
                                          <p><span className="font-semibold">From:</span> {format(parseISO(booking.startTime), 'MMM d, h:mm a')}</p>
                                          <p><span className="font-semibold">To: </span> {format(parseISO(booking.endTime), 'MMM d, h:mm a')}</p>
                                      </div>
                                     {booking.user && <p className="text-xs text-gray-500 mt-1">By: {booking.user.username || booking.user.email || 'N/A'}</p>}
                                  </li>
                             ))}
                         </ul>
                     )}
                 </div>
             </div>
         </div>
    );
}

export default AdminScheduleViewer;