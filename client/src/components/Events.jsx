import { useState, useEffect } from "react";
import { format } from "date-fns";

const Events = () => {
  const [events, setEvents] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/bookings/public/events`;
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }

        const data = await response.json();
        if (data.success && Array.isArray(data.data)) {
          const now = new Date();
          // Filter and format events with status
          const approvedEvents = data.data
            .map(booking => {
              const startTime = new Date(booking.startTime);
              const endTime = new Date(booking.endTime);
              const status = now >= startTime && now <= endTime ? 'running' : 'upcoming';
              
              return {
                id: booking._id,
                title: booking.eventName,
                location: booking.auditorium?.name || 'TBD',
                date: format(startTime, 'MMM dd, yyyy'),
                time: format(startTime, 'hh:mm a'),
                status,
                startTime, // Keep for sorting
              };
            })
            // Sort: running events first, then by start time
            .sort((a, b) => {
              if (a.status === 'running' && b.status !== 'running') return -1;
              if (a.status !== 'running' && b.status === 'running') return 1;
              return a.startTime - b.startTime;
            });
          setEvents(approvedEvents);
        }
      } catch (err) {
        console.error('Error fetching events:', err);
        setError('Unable to load upcoming events');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
    const interval = setInterval(fetchEvents, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-slide effect
  useEffect(() => {
    if (events.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => 
        prevIndex === events.length - 1 ? 0 : prevIndex + 1
      );
    }, 3000);
    
    return () => clearInterval(interval);
  }, [events.length]);

  if (isLoading) {
    return (
      <div className="relative w-full h-24 bg-gradient-to-r from-red-50 to-red-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-600 animate-pulse">Loading upcoming events...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative w-full h-24 bg-red-50 rounded-lg flex items-center justify-center">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="relative w-full h-24 bg-gradient-to-r from-red-50 to-red-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-600">No upcoming events scheduled</p>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* Event Names Carousel */}
      <div className="relative h-32 overflow-hidden rounded-lg bg-gradient-to-r from-red-50 to-red-100">
        <div className="flex justify-center items-center h-full">
          {events.map((event, index) => (
            <div
              key={event.id}
              className={`absolute w-full px-4 transition-all duration-700 ease-in-out transform ${
                index === currentIndex 
                  ? "opacity-100 translate-y-0" 
                  : "opacity-0 translate-y-8"
              }`}
            >
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-gray-800">
                    {event.title}
                  </h2>
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      event.status === 'running'
                        ? 'bg-green-100 text-green-800 border border-green-200'
                        : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                    }`}
                  >
                    {event.status === 'running' ? 'Now Playing' : 'Upcoming'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {event.location} • {event.date} • {event.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Slider indicators */}
      <div className="absolute z-30 flex bottom-2 left-1/2 space-x-3 -translate-x-1/2">
        {events.map((_, index) => (
          <button
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? "bg-red-600 w-4" 
                : "bg-gray-400"
            }`}
            onClick={() => setCurrentIndex(index)}
            aria-label={`Slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default Events;
