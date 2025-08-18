import React, { useEffect, useState, useRef } from "react";
import { buildImageUrl } from '../utils/imagePath';

const AllEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // Modal state for image preview
  const [preview, setPreview] = useState({ open: false, src: '', title: '' });
  const topRef = useRef(null);
  const [orientationMap, setOrientationMap] = useState({}); // { eventId: 'portrait'|'landscape' }

  useEffect(() => {
    setLoading(true);
    setError("");
    const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
    fetch(`${apiBase}/api/bookings/public/events?page=${page}&limit=9`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch events");
        return res.json();
      })
      .then((data) => {
        let list = data.data || [];
        list = list.slice().sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        setEvents(list);
        setTotalPages(data.totalPages || Math.max(1, Math.ceil((data.totalCount || data.count || list.length) / 9)));
        setLoading(false);
        // Scroll to top of component after new page loads
        if (topRef.current) {
          const y = topRef.current.getBoundingClientRect().top + window.scrollY - 90; // offset for navbar
          window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to load events");
        setLoading(false);
      });
  }, [page]);

  // Lock body scroll when modal open
  useEffect(() => {
    if (preview.open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [preview.open]);

  // Close on ESC
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setPreview(p => ({ ...p, open: false })); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const now = new Date();

  const formatRelative = (dateStr) => {
    const d = new Date(dateStr);
    const diffMs = d - now;
    if (diffMs <= 0) return "Started";
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `In ${diffMins} min${diffMins === 1 ? '' : 's'}`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `In ${diffHours} hr${diffHours === 1 ? '' : 's'}`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `In ${diffDays} day${diffDays === 1 ? '' : 's'}`;
    const diffMonths = Math.floor(diffDays / 30);
    return `In ${diffMonths} mo${diffMonths === 1 ? '' : 's'}`;
  };

  const getStatus = (event) => {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    if (now >= start && now <= end) {
      return { label: 'Ongoing', color: 'bg-green-400/90 text-green-900', accent: 'ring-green-300' };
    }
    if (start > now) {
      return { label: formatRelative(event.startTime), color: 'bg-amber-300/90 text-amber-900', accent: 'ring-amber-300' };
    }
    return { label: 'Finished', color: 'bg-gray-300/80 text-gray-800', accent: 'ring-gray-300' };
  };

  const SkeletonCard = () => (
    <div className="flex flex-col rounded-xl overflow-hidden bg-white/5 backdrop-blur-md border border-white/10 animate-pulse">
      <div className="h-44 w-full bg-gradient-to-br from-gray-300 to-gray-200" />
      <div className="p-5 space-y-3">
        <div className="h-5 bg-gray-300 rounded w-2/3" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );

  return (
  <div ref={topRef} className="relative min-h-screen pt-6 pb-14 px-4 flex flex-col items-center overflow-hidden">
      {/* Layered background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,#ffe5e5,#ffffff_55%,#fff)]" />
      <div className="pointer-events-none absolute inset-0 opacity-20 mix-blend-multiply bg-[conic-gradient(from_120deg_at_50%_50%,#82181A_0deg,#ffb4b4_120deg,#82181A_240deg,#ffb4b4_360deg)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(130,24,26,0.08),rgba(0,0,0,0.05))]" />

      <div className="w-full max-w-7xl relative">
  <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#82181A] via-[#a32a2c] to-[#d05f60] drop-shadow-sm">
            Upcoming & Ongoing Events
          </h1>
          <p className="mt-3 text-gray-600 max-w-2xl mx-auto text-sm md:text-base">
            Discover what's happening. Stay informed about current sessions and plan ahead for upcoming events.
          </p>
        </div>

        <div className="backdrop-blur-xl bg-white/70 border border-white/30 shadow-2xl rounded-3xl p-6 md:p-10 ring-1 ring-[#82181A]/10">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : error ? (
            <div className="text-center text-red-600 font-semibold py-12">{error}</div>
          ) : events.length === 0 ? (
            <div className="text-center text-gray-500 py-12">No events found.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {events.map(event => {
                  const status = getStatus(event);
                  const accent = status.label.startsWith('In') ? 'from-amber-300/70 to-amber-400/80' : status.label === 'Ongoing' ? 'from-green-400/80 to-green-500/80' : 'from-gray-300/70 to-gray-400/70';
                  return (
                    <div
                      key={event._id}
                      className="group relative flex flex-col rounded-2xl overflow-hidden bg-[linear-gradient(145deg,#ffffff,#f3f0f0)] border border-gray-200/70 shadow-[0_4px_10px_-2px_rgba(0,0,0,0.06),0_2px_4px_-1px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_28px_-6px_rgba(130,24,26,0.25)] transition-all duration-400"
                    >
                      {/* Accent bar */}
                      <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${accent}`} />
                      <div
                        className={`relative w-full aspect-[16/9] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden ${event.eventImages?.length ? 'cursor-pointer' : ''}`}
                        onClick={() => {
                          if (event.eventImages && event.eventImages.length > 0) {
                            const full = buildImageUrl(event.eventImages[0]);
                            setPreview({ open: true, src: full, title: event.eventName });
                          }
                        }}
                        title={event.eventImages?.length ? 'Click to enlarge' : ''}
                      >
                        {event.eventImages && event.eventImages.length > 0 ? (
                          <img
                            src={buildImageUrl(event.eventImages[0])}
                            alt={event.eventName}
                            className={
                              `w-full h-full transition-transform duration-500 group-hover:scale-105 ` +
                              (orientationMap[event._id] === 'portrait'
                                ? 'object-contain p-2 bg-gradient-to-br from-white to-gray-100'
                                : 'object-cover')
                            }
                            loading="lazy"
                            onLoad={(e) => {
                              const img = e.target;
                              const orientation = img.naturalHeight > img.naturalWidth * 1.15 ? 'portrait' : 'landscape';
                              setOrientationMap(prev => prev[event._id] ? prev : { ...prev, [event._id]: orientation });
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 text-[11px] gap-2 select-none">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="opacity-40"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                            No Cover
                          </div>
                        )}
                        {orientationMap[event._id] === 'portrait' && (
                          <div className="absolute bottom-2 right-2 text-[10px] px-2 py-0.5 rounded bg-black/40 text-white backdrop-blur-sm">Poster</div>
                        )}
                        <div className={`absolute top-2 left-2 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide shadow-sm ring-1 ring-black/5 ${status.color}`}>{status.label}</div>

                        <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="p-5 flex flex-col flex-1">
                        <h2 className="text-[15px] md:text-[16px] font-semibold text-gray-900 mb-1.5 leading-snug line-clamp-2 group-hover:text-[#82181A] transition-colors">
                          {event.eventName}
                        </h2>
                        <div className="flex items-center gap-2 text-[10px] font-medium tracking-wide text-gray-600 mb-2">
                          <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 border border-gray-200 shadow-sm">
                            {event.auditorium?.name || 'TBD'}
                          </span>
                        </div>
                        <p className="text-[11.5px] text-gray-600 mb-2 font-medium">
                          {new Date(event.startTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                        {event.description && (
                          <p className="text-[13px] text-gray-700 mb-3 line-clamp-3 leading-relaxed">
                            {event.description}
                          </p>
                        )}
                        <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-100">
                          <div className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            Ends {new Date(event.endTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          {/* Placeholder for future action */}
                          {/* <button className="text-xs text-[#82181A] font-semibold hover:underline">Details</button> */}
                        </div>
                      </div>
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-[radial-gradient(circle_at_30%_20%,rgba(130,24,26,0.08),transparent_70%)]" />
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 mt-10">
                <button
                  className="px-4 py-2 rounded-full text-sm font-medium bg-white/70 hover:bg-white shadow border border-[#82181A]/20 text-[#82181A] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                >
                  Previous
                </button>
                <div className="flex items-center gap-1 text-xs font-semibold tracking-wide text-[#82181A] bg-white/60 px-4 py-2 rounded-full border border-[#82181A]/10">
                  Page {page} / {totalPages}
                </div>
                <button
                  className="px-4 py-2 rounded-full text-sm font-medium bg-[#82181A] hover:bg-[#9d2224] shadow text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {preview.open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 backdrop-blur-md bg-black/40 animate-fadeIn"
          onClick={() => setPreview(p => ({ ...p, open: false }))}
        >
          <div
            className="relative max-w-4xl w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-neutral-900/80"
            onClick={e => e.stopPropagation()}
          >
            <button
              aria-label="Close"
              onClick={() => setPreview(p => ({ ...p, open: false }))}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-md border border-white/10 transition"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            {preview.title && (
              <div className="absolute left-0 right-0 top-0 bg-gradient-to-b from-black/70 to-transparent px-5 pt-5 pb-10 pointer-events-none">
                <h3 className="text-white font-semibold text-lg drop-shadow">{preview.title}</h3>
              </div>
            )}
            <img
              src={preview.src}
              alt={preview.title}
              className="w-full h-full object-contain max-h-[80vh] bg-black/40"
              loading="eager"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AllEvents;
