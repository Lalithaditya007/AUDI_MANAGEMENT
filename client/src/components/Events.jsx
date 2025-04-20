import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

// Simple fallback for when images don't load
const fallbackGradient = "bg-gradient-to-r from-red-800 to-red-900";
// API Base URL (needed for API calls, not necessarily image construction anymore)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageLoaded, setImageLoaded] = useState({});
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const apiUrl = `${API_BASE_URL}/api/bookings/public/events`; // Use API_BASE_URL here
        console.log('Fetching events from:', apiUrl);

        const response = await fetch(apiUrl);

        if (!response.ok) {
          throw new Error(`Failed to fetch events: ${response.status}`);
        }

        const data = await response.json();

        if (data.success && Array.isArray(data.data)) {
          let processedEvents = data.data.map(booking => {
            const startTime = new Date(booking.startTime);
            const endTime = new Date(booking.endTime);
            const status = new Date() >= startTime && new Date() <= endTime ? 'running' : 'upcoming';

            // --- CORRECTED IMAGE URL LOGIC ---
            const imagePath = booking.eventImages?.[0];
            // Use the full URL directly if it starts with http (like Azure URLs)
            const imageUrl = imagePath && imagePath.startsWith('http') ? imagePath : null;
            // --- END CORRECTION ---

            // Generate an initial random factor for each event (will be updated on image load)
            const initialRandomFactor = Math.floor(Math.random() * 100);

            // Assign initial random size class before image loads
            let colSpan = 1;
            let rowSpan = 1;

            // Random initial sizing (will be refined when image loads)
            if (initialRandomFactor > 85) {
              colSpan = 2;
              rowSpan = 2;
            } else if (initialRandomFactor > 70) {
              colSpan = 2;
              rowSpan = 1;
            } else if (initialRandomFactor > 55) {
              colSpan = 1;
              rowSpan = 2;
            }

            return {
              id: booking._id,
              title: booking.eventName,
              location: booking.auditorium?.name || 'TBD',
              date: format(startTime, 'MMM dd, yyyy'),
              time: format(startTime, 'hh:mm a'),
              status,
              imageUrl, // Use the corrected imageUrl
              randomFactor: initialRandomFactor,
              sizeClass: `col-span-${colSpan} row-span-${rowSpan}`
            };
          });

          // Sort events by date (upcoming first)
          processedEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

          // Limit to events that will fit in 4 rows (maximum 16 events)
          const maxEvents = Math.min(processedEvents.length, 16);
          processedEvents = processedEvents.slice(0, maxEvents);

          console.log(`Processed ${processedEvents.length} events for display with random sizing`);
          setEvents(processedEvents);
        } else {
          setEvents([]);
        }
      } catch (err) {
        console.error('Error fetching events:', err);
        setError('Unable to load events');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Extract image dimensions and determine appropriate grid size with randomization
  const handleImageLoad = (event, id, img) => {
    try {
      // Get the natural width and height of the image
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      const aspectRatio = width / height;

      // Find the current event
      const currentEvent = events.find(e => e.id === id);
      if (!currentEvent) return;

      console.log(`Image dimensions for "${currentEvent.title}": ${width}x${height}, ratio: ${aspectRatio.toFixed(2)}`);

      // Use the event's existing random factor or generate a new one
      const randomFactor = currentEvent.randomFactor || Math.floor(Math.random() * 100);

      // Determine box size based on both image dimensions AND randomization
      let colSpan = 1;
      let rowSpan = 1;

      // Wide landscape images (panoramic, banners, etc.)
      if (aspectRatio > 1.8 || (aspectRatio > 1.5 && randomFactor > 70)) {
        colSpan = 2;
        rowSpan = 1;
      }
      // Very wide images
      else if (aspectRatio > 1.4 || (aspectRatio > 1.2 && randomFactor > 80)) {
        colSpan = 2;
        rowSpan = randomFactor > 90 ? 2 : 1; // Occasionally make wide images larger
      }
      // Tall portrait images (posters, etc.)
      else if (aspectRatio < 0.7 || (aspectRatio < 0.8 && randomFactor > 75)) {
        colSpan = randomFactor > 85 ? 2 : 1; // Occasionally make tall images wider
        rowSpan = 2;
      }
      // Very tall images
      else if (aspectRatio < 0.6) {
        colSpan = 1;
        rowSpan = 2;
      }
      // Square or nearly square images get larger treatment with randomization
      else if ((aspectRatio >= 0.9 && aspectRatio <= 1.1) || randomFactor > 85) {
        // More randomness for square-ish images
        colSpan = randomFactor > 40 ? 2 : 1;
        rowSpan = randomFactor > 60 ? 2 : 1;
      }
      // For remaining images around 4:3 or 3:4 ratio, add randomness
      else if (width > 1200 || height > 1200 || randomFactor > 75) {
        if (randomFactor > 90) {
          // Big feature - 10% chance
          colSpan = 2;
          rowSpan = 2;
        } else if (randomFactor > 70) {
          // Wide rectangle - 20% chance
          colSpan = 2;
          rowSpan = 1;
        } else if (randomFactor > 50) {
          // Tall rectangle - 20% chance
          colSpan = 1;
          rowSpan = 2;
        }
        // else standard 1x1 cell
      }

      // Ensure we don't exceed grid bounds
      colSpan = Math.min(colSpan, 2);
      rowSpan = Math.min(rowSpan, 2);

      const sizeClass = `col-span-${colSpan} row-span-${rowSpan}`;

      console.log(`Assigned grid size for "${currentEvent.title}": ${colSpan}×${rowSpan} with random factor ${randomFactor}`);

      // Update the event with the appropriate size class based on image dimensions + randomization
      setEvents(prevEvents =>
        prevEvents.map(e =>
          e.id === id ? {
            ...e,
            sizeClass,
            aspectRatio,
            imageDimensions: { width, height },
            randomFactor
          } : e
        )
      );

      // Mark image as loaded
      setImageLoaded(prev => ({...prev, [id]: true}));
    } catch (err) {
      console.error('Error handling image load:', err);
    }
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event);
  };

  const closePopup = () => {
    setSelectedEvent(null);
  };

  // Display states
  if (isLoading) {
    return (
      <div className="h-[720px] flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[720px] flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="h-[720px] flex items-center justify-center">
        <p className="text-gray-500">No current or upcoming events</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Bento Grid Layout - Up to 4 rows in height */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 auto-rows-[180px] max-h-[756px] overflow-hidden">
        {events.map((event) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className={`${event.sizeClass} relative overflow-hidden rounded-xl shadow-lg cursor-pointer group`}
            whileHover={{ y: -5 }}
            onClick={() => handleEventClick(event)}
          >
            {/* Event Image with Fallback - Now with padding */}
            <div className="absolute inset-0 overflow-hidden p-0">
              {event.imageUrl ? (
                <div className="relative w-full h-full">
                  <img
                    src={event.imageUrl} // Use the corrected imageUrl
                    alt={event.title}
                    className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105 p-1"
                    onLoad={(e) => handleImageLoad(e, event.id, e.target)}
                    onError={(e) => {
                      console.log('Image load error for:', event.title);
                      e.target.onerror = null;
                      // Use a gradient background when image fails to load
                      e.target.parentNode.classList.add(...fallbackGradient.split(' '));
                      e.target.style.display = 'none';
                    }}
                  />
                  {/* Background gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
                </div>
              ) : (
                <div className={`w-full h-full ${fallbackGradient} flex items-center justify-center`}>
                  <span className="text-white/70">No Image</span>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent" />
                </div>
              )}
            </div>

            {/* Event Content */}
            <div className="relative h-full flex flex-col justify-end p-4 text-white">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h2 className="text-lg md:text-xl font-bold line-clamp-2">{event.title}</h2>
                <span
                  className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
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
              {/* Debug info - now with random factor */}
              {event.imageDimensions && (
                <div className="opacity-0 group-hover:opacity-75 transition-opacity text-[10px] mt-1 text-white/50">
                  {event.imageDimensions.width}×{event.imageDimensions.height} ({event.aspectRatio?.toFixed(2)}) • RF:{event.randomFactor}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Image Popup Modal */}
      <AnimatePresence>
        {selectedEvent && selectedEvent.imageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            onClick={closePopup}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 20 }}
              className="relative max-w-4xl max-h-[85vh] overflow-hidden bg-white rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative overflow-hidden">
                {/* Image */}
                <div className="flex items-center justify-center bg-black">
                  <img
                    src={selectedEvent.imageUrl}
                    alt={selectedEvent.title}
                    className="max-w-full max-h-[70vh] object-contain"
                  />
                </div>

                {/* Event Details */}
                <div className="p-4 bg-white">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-800">{selectedEvent.title}</h3>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedEvent.status === 'running'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {selectedEvent.status === 'running' ? 'Now Playing' : 'Upcoming'}
                    </span>
                  </div>
                  <p className="mt-2 text-gray-600">
                    <span className="font-semibold">Location:</span> {selectedEvent.location}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-semibold">Date & Time:</span> {selectedEvent.date} at {selectedEvent.time}
                  </p>
                </div>

                {/* Close Button */}
                <button
                  onClick={closePopup}
                  className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 text-gray-800 hover:bg-white transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Events;