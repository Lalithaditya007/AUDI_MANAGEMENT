import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import NotFound from '../NotFound';
import { buildAuditoriumImage } from '../../utils/imagePath';

const AuditoriumDetails = ({ isLoggedIn, userRole }) => {
  const { id } = useParams();
  const [auditorium, setAuditorium] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeImg, setActiveImg] = useState(0);

  useEffect(() => {
    fetch(`/api/auditoriums/${id}`)
      .then(res => { if (!res.ok) throw new Error('Failed to fetch auditorium'); return res.json(); })
      .then(data => { if (data.success && data.data) { setAuditorium(data.data); } else { setError('Auditorium not found'); } setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[70vh] bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto px-6 py-20 animate-pulse">
          <div className="h-10 w-2/3 bg-slate-200 rounded mb-10" />
          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-6">
              <div className="aspect-[16/8] rounded-2xl bg-slate-200" />
              <div className="h-24 bg-slate-100 rounded-xl" />
              <div className="h-32 bg-slate-100 rounded-xl" />
            </div>
            <div className="space-y-6">
              <div className="h-56 bg-slate-100 rounded-xl" />
              <div className="h-40 bg-slate-100 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  if (error || !auditorium) return <NotFound />;
  const images = Array.isArray(auditorium.images) ? auditorium.images : [];
  const processedImages = images.map(img => buildAuditoriumImage(img));
  const mainImage = processedImages[activeImg] || null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 pb-24">
      <div className="max-w-7xl mx-auto px-6 pt-12 lg:pt-16">
        {/* Breadcrumb / Back */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Link to="/auditoriums" className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-700 font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back
            </Link>
            <span className="text-slate-400">/</span>
            <span>{auditorium.name}</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isLoggedIn && userRole === 'user' ? (
              <Link to={`/book-auditorium?auditorium=${auditorium._id}`} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium shadow hover:bg-indigo-500 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Book Now
              </Link>
            ) : (
              <Link to="/login" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-50 text-indigo-700 text-sm font-medium shadow-sm hover:bg-indigo-100 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                Sign In to Book
              </Link>
            )}
          </div>
        </div>

        {/* Title & Meta */}
        <div className="mb-10">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-700 via-violet-600 to-fuchsia-600 bg-clip-text text-transparent">{auditorium.name}</h1>
            <div className="flex flex-wrap gap-3 mt-5">
              <span className="inline-flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 6h10M9 14h6m2 4H7" /></svg>
                {auditorium.capacity} Seats
              </span>
              <span className="inline-flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7z" /></svg>
                {auditorium.location}
              </span>
              <span className={`inline-flex items-center gap-2 pl-2 pr-3 py-1 rounded-full text-xs font-medium ${auditorium.available ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{auditorium.available ? 'Available' : 'Not Available'}</span>
            </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-10">
          {/* Main Content */}
          <div className="lg:col-span-2 flex flex-col gap-10">
            {/* Gallery */}
            <div className="bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="aspect-[16/8] md:aspect-[16/6] w-full relative group bg-slate-100">
                {mainImage ? (
                  <img src={mainImage} alt={auditorium.name} className="w-full h-full object-cover transition duration-700 group-hover:scale-[1.02]" />
                ) : <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">No Image</div>}
                <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
              </div>
              {processedImages.length > 1 && (
                <div className="p-4 border-t border-slate-100 flex gap-3 overflow-x-auto scrollbar-thin scrollbar-thumb-indigo-300/60">
                  {processedImages.map((img,i)=>(
                    <button key={i} onClick={()=>setActiveImg(i)} className={`relative w-24 h-16 rounded-lg overflow-hidden ring-2 transition ${i===activeImg?'ring-indigo-500 shadow':'ring-transparent hover:ring-indigo-300'}`}> 
                      <img src={img} alt={`View ${i+1}`} className="w-full h-full object-cover" />
                      {i===activeImg && <span className="absolute inset-0 border-2 border-indigo-500 rounded-lg" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-slate-200 p-8">
              <h2 className="text-xl font-bold text-slate-800 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 text-sm font-semibold">i</span>
                Overview
              </h2>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line">{auditorium.description || 'No description provided.'}</p>
            </div>

            {/* Amenities */}
            <div className="bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-slate-200 p-8">
              <h2 className="text-xl font-bold text-slate-800 mb-5 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-600 text-sm font-semibold">★</span>
                Amenities
              </h2>
              {Array.isArray(auditorium.amenities) && auditorium.amenities.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {auditorium.amenities.map((a,i)=>(
                    <span key={i} className="px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-50 via-violet-50 to-fuchsia-50 border border-violet-200 text-sm text-indigo-700 font-medium shadow-sm hover:shadow transition">{a}</span>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500 text-sm">No amenities listed.</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
            <div className="flex flex-col gap-8 lg:sticky lg:top-24 h-fit">
              <div className="bg-white/80 backdrop-blur rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">Quick Facts</h3>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li className="flex items-start gap-3"><span className="w-6 h-6 flex items-center justify-center rounded-md bg-indigo-100 text-indigo-600 text-xs font-bold">C</span><span><strong>Capacity:</strong> {auditorium.capacity}</span></li>
                  <li className="flex items-start gap-3"><span className="w-6 h-6 flex items-center justify-center rounded-md bg-indigo-100 text-indigo-600 text-xs font-bold">L</span><span><strong>Location:</strong> {auditorium.location}</span></li>
                  <li className="flex items-start gap-3"><span className="w-6 h-6 flex items-center justify-center rounded-md bg-indigo-100 text-indigo-600 text-xs font-bold">S</span><span><strong>Status:</strong> {auditorium.available ? 'Available' : 'Not Available'}</span></li>
                  {auditorium.contactInfo && <li className="flex items-start gap-3"><span className="w-6 h-6 flex items-center justify-center rounded-md bg-indigo-100 text-indigo-600 text-xs font-bold">@</span><span><strong>Contact:</strong> {auditorium.contactInfo}</span></li>}
                </ul>
              </div>
              <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <h3 className="text-xl font-bold mb-2 tracking-tight">Host Your Event</h3>
                <p className="text-sm text-white/80 mb-6 leading-relaxed">Reserve a professional venue with modern infrastructure for seminars, cultural programs and workshops.</p>
                {isLoggedIn && userRole === 'user' ? (
                  <Link to={`/book-auditorium?auditorium=${auditorium._id}`} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-indigo-700 font-semibold shadow hover:shadow-md transition">
                    Book Now
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  </Link>
                ) : (
                  <Link to="/login" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/20 text-white font-medium backdrop-blur border border-white/30 hover:bg-white/30 transition">
                    Sign In to Book
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  </Link>
                )}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AuditoriumDetails;
