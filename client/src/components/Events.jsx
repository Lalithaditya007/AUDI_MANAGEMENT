import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/bookings/public/events`;
        console.log('Fetching from:', apiUrl); // Debug log

        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }

        const data = await response.json();
        console.log('Received data:', data); // Debug log

        if (data.success && Array.isArray(data.data)) {
          const approvedEvents = data.data
            .map(booking => {
              const startTime = new Date(booking.startTime);
              const endTime = new Date(booking.endTime);
              const status = new Date() >= startTime && new Date() <= endTime ? 'running' : 'upcoming';
              
              // Construct full image URL
              const imagePath = booking.eventImages?.[0];
              const imageUrl = imagePath 
                ? `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${imagePath}`
                : null;
              
              console.log('Processing booking:', {
                id: booking._id,
                title: booking.eventName,
                imagePath,
                imageUrl
              }); // Debug log

              return {
                id: booking._id,
                title: booking.eventName,
                location: booking.auditorium?.name || 'TBD',
                date: format(startTime, 'MMM dd, yyyy'),
                time: format(startTime, 'hh:mm a'),
                status,
                startTime,
                imageUrl
              };
            });

          console.log('Processed events:', approvedEvents); // Debug log
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
  }, []);

  // Auto-slide effect
  useEffect(() => {
    if (events.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % events.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [events.length]);

  if (isLoading) {
    return (
      <div className="h-80 flex items-center justify-center">
        <p className="text-white animate-pulse">Loading events...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-80 flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="h-80 flex items-center justify-center">
        <p className="text-gray-300">No upcoming events</p>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div className="relative h-80 overflow-hidden rounded-lg">
        {events.map((event, index) => (
          <div
            key={event.id}
            className={`absolute inset-0 transition-all duration-700 ease-in-out ${
              index === currentIndex ? "opacity-100" : "opacity-0"
            }`}
          >
            {/* Event Image with Fallback */}
            <div className="absolute inset-0">
              {event.imageUrl ? (
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = 'https://via.placeholder.com/800x400?text=No+Image';
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-gray-800 to-red-800" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
            </div>

            {/* Event Content */}
            <div className="relative h-full flex flex-col justify-end p-6 text-white">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold">{event.title}</h2>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    event.status === 'running'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {event.status === 'running' ? 'Now Playing' : 'Upcoming'}
                </span>
              </div>
              <p className="text-sm text-gray-300">
                {event.location} • {event.date} • {event.time}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Carousel Indicators */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {events.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? "bg-white w-4" 
                : "bg-white/50 hover:bg-white/75"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default Events;
