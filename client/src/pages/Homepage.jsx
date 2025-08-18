import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Events from '../components/Events.jsx';
import clg from '../assets/clg.jpg';
import { buildImageUrl, buildAuditoriumImage } from '../utils/imagePath';
import ksaudi from '../assets/ksaudi/ksaudi1.jpg'; // A fallback image
// Note: The other images 'bblock' and 'PEB' are not used in this dynamic version, which is fine.
import { motion } from 'motion/react';
// The 'Link' component from 'react-router-dom' was imported but not used. It's good practice to remove unused imports, but it's not an error.

// This component fetches and displays the first 3 auditoriums from your API
function FeaturedAuditoriums({ isLoggedIn, userRole }) {
  const [auditoriums, setAuditoriums] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auditoriums')
      .then(res => {
        const contentType = res.headers.get('content-type');
        if (!res.ok) {
          throw new Error(`Network error: ${res.status}`);
        }
        if (!contentType || !contentType.includes('application/json')) {
          return res.text().then(text => {
            throw new Error('Expected JSON, got: ' + text.slice(0, 100));
          });
        }
        return res.json();
      })
      .then(data => {
        console.log(data);
        if (data && Array.isArray(data.data)) {
          setAuditoriums(data.data.slice(0, 3));
        } else {
          setAuditoriums([]);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error("Failed to fetch auditoriums:", error);
        setAuditoriums([]);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {auditoriums.map(auditorium => (
        <div key={auditorium._id} className="flex flex-col bg-white rounded-xl overflow-hidden shadow-lg group">
          <div>
            <div className="h-64 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
          <img
            src={Array.isArray(auditorium.images) && auditorium.images.length > 0 ? buildAuditoriumImage(auditorium.images[0]) : ksaudi}
           alt={auditorium.name}
           className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700" />
              <div className="absolute bottom-0 left-0 right-0 p-5 z-20">
                <h3 className="text-2xl font-bold text-white">{auditorium.name}</h3>
                <p className="text-white/80 text-sm">{auditorium.capacity} Seats</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <p className="text-gray-600 mb-4">{auditorium.description}</p>
            <div className="flex flex-col gap-3">
              <Link to={`/auditorium/${auditorium._id}`} className="text-red-600 font-medium flex items-center group-hover:text-red-700">
                View Details
                <svg className="w-4 h-4 ml-2 transform transition-transform group-hover:translate-x-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </Link>
              {auditorium.available && isLoggedIn && userRole === 'user' && (
                <Link 
                  to={`/book-auditorium?auditorium=${auditorium._id}`}
                  className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white text-sm rounded-lg font-medium hover:from-red-700 hover:to-red-800 transition-all duration-300 transform hover:scale-105"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Book Now
                </Link>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}


const HomePage = ({ isLoggedIn, userRole }) => {
  const [carouselEvents, setCarouselEvents] = useState([]);
  const [active, setActive] = useState(0);
  const intervalRef = React.useRef(null);

  useEffect(()=>{
    const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/,'');
    fetch(`${base}/api/bookings/public/events?limit=8`)
      .then(r=> r.ok? r.json(): Promise.reject(r.status))
      .then(data=>{
        const events = (data.data||[])
          .slice()
          .sort((a,b)=> new Date(a.startTime)-new Date(b.startTime))
          .slice(0,4)
          .map(ev=> ({
            id: ev._id,
            title: ev.eventName,
            when: new Date(ev.startTime).toLocaleString('en-IN',{ dateStyle:'medium', timeStyle:'short'}),
            image: buildImageUrl(ev.eventImages?.[0]||''),
            auditoriumName: ev.auditorium?.name || 'TBD',
            auditoriumLocation: ev.auditorium?.location || '—',
            auditoriumCapacity: ev.auditorium?.capacity || null,
            auditoriumDescription: ev.auditorium?.description || '',
            description: ev.description || ''
          }));
        setCarouselEvents(events);
      }).catch(()=>{});
  },[]);

  useEffect(()=>{ // autoplay
    if(carouselEvents.length===0) return; 
    intervalRef.current = setInterval(()=> setActive(a=> (a+1)%carouselEvents.length), 5000);
    return ()=> clearInterval(intervalRef.current);
  },[carouselEvents]);

  const go = (dir)=> setActive(a=> (a + dir + carouselEvents.length) % carouselEvents.length);

  return (
    <div className="min-h-screen flex flex-col">
    {/* Hero Section */}
  <header id="hero" className="relative min-h-[100vh] pb-[75px] flex items-center justify-center pt-0 mt-0">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat top-0 left-0"
          style={{ backgroundImage: `url(${clg})` }}
        >
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        </div>
        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-4 text-center">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
              A Space to Chill,
              <span className="text-red-600 font-extrabold"> A Place to Learn</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 font-light max-w-3xl mx-auto">
              Where Moments Turn into Memories
            </p>
            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 justify-center mt-8">
              <div className="flex flex-col items-center">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    to="/auditoriums"
                    className="px-8 py-3 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700 transition-colors duration-300"
                  >
                    Explore Auditoriums
                  </Link>
                </motion.div>
                {/* ...existing code... */}
              </div>
              {/* Conditional "Book Now" Button */}
              {!(isLoggedIn && userRole === 'admin') && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    to={isLoggedIn ? "/book-auditorium" : "/login"}
                    className="px-8 py-3 bg-white/10 backdrop-blur-sm text-white rounded-full font-semibold hover:bg-white/20 transition-colors duration-300 border border-white/30"
                  >
                    Book Now
                  </Link>
                </motion.div>
              )}
            </div>
          </div>
        </div>
        {/* Arrow absolutely positioned at the bottom of the hero image */}
        <div className="absolute left-1/2 bottom-8 transform -translate-x-1/2 z-30 animate-bounce">
          <svg className="w-8 h-8 text-white drop-shadow-lg" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
        </div>
      </header>

      {/* Nearest Events Carousel */}
      <section className="py-16 relative bg-gradient-to-b from-white to-red-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-start mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-[#82181A]">Upcoming Soon</h2>
          </div>
          {carouselEvents.length === 0 ? (
            <div className="text-center text-gray-500 py-10">No events found.</div>
          ) : (
            <div className="relative">
              <div className="overflow-hidden rounded-2xl shadow-lg bg-white">
                <div className="flex transition-transform duration-700 ease-in-out" style={{ transform:`translateX(-${active * 100}%)`}}>
                  {carouselEvents.map(ev => (
                    <div key={ev.id} className="min-w-full flex flex-col md:flex-row">
                      <div className="md:w-1/2 h-72 md:h-96 relative group overflow-hidden bg-black">
                        {ev.image ? (
                          <img src={ev.image} alt={ev.title} referrerPolicy="no-referrer" crossOrigin="anonymous" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" onError={(e)=>{e.currentTarget.style.display='none'; e.currentTarget.parentElement.classList.add('bg-gradient-to-br','from-red-100','to-red-200','flex','items-center','justify-center','text-red-700','font-medium'); e.currentTarget.parentElement.textContent='Image Unavailable';}} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-100 to-red-200 text-red-700 font-medium">No Image</div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                        <div className="absolute bottom-4 left-4 text-white text-xs uppercase tracking-wide bg-black/40 backdrop-blur px-3 py-1 rounded-full">{ev.auditoriumName}</div>
                      </div>
                      <div className="md:w-1/2 p-8 flex flex-col bg-white/95">
                        <h3 className="text-2xl md:text-3xl font-bold text-[#82181A] mb-2 leading-snug">{ev.title}</h3>
                        <p className="text-sm text-gray-500 mb-4">{ev.when}</p>
                        <div className="space-y-2 text-sm text-gray-700">
                          {ev.description && <p className="line-clamp-4"><span className="font-semibold text-[#82181A]">About:</span> {ev.description}</p>}
                          <p><span className="font-semibold text-[#82181A]">Auditorium:</span> {ev.auditoriumName}</p>
                          {ev.auditoriumLocation && <p><span className="font-semibold text-[#82181A]">Location:</span> {ev.auditoriumLocation}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={()=>go(-1)} aria-label="Previous" className="absolute top-1/2 -translate-y-1/2 left-3 w-10 h-10 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white text-[#82181A]">‹</button>
              <button onClick={()=>go(1)} aria-label="Next" className="absolute top-1/2 -translate-y-1/2 right-3 w-10 h-10 rounded-full bg-white/90 shadow flex items-center justify-center hover:bg-white text-[#82181A]">›</button>
              <div className="flex gap-2 justify-center mt-6">
                {carouselEvents.map((_,i)=>(<button key={i} onClick={()=>setActive(i)} className={`h-2.5 rounded-full transition-all ${i===active?'w-8 bg-[#82181A]':'w-3 bg-gray-300 hover:bg-gray-400'}`} />))}
              </div>
            </div>
          )}
          {/* CTA below carousel */}
          <div className="mt-10 text-center">
            <Link to="/events" className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-[#82181A] text-white font-semibold shadow hover:bg-[#9d2224] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#82181A] transition">
              Explore All Events
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 12h14" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Events Section */}
      {/* <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gray-50/90"><div className="absolute inset-0 bg-[url('/src/assets/pattern.png')] opacity-10 mix-blend-overlay"></div></div>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="w-[90%] mx-auto px-4 relative z-10">
           <div className="text-center mb-12"><motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="text-4xl md:text-5xl font-bold mb-4"><span className="text-[#82181A]"> Current & Upcoming Events </span></motion.h2><motion.div initial={{ width: 0 }} whileInView={{ width: "100px" }} transition={{ duration: 0.8, delay: 0.4 }} className="h-1 bg-red-400 mx-auto rounded-full" /></div>
           <div className="w-full mx-auto backdrop-blur-md bg-white/10 rounded-2xl p-6 shadow-2xl border-2 border-[#82181A]/20"><Events /></div>
           <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.6 }} className="mt-8 text-center"></motion.div>
        </motion.div>
      </section> */}

      {/* How It Works Section (Conditional) */}
        {!(isLoggedIn && userRole === 'admin') && (
          <section className="py-20 bg-gradient-to-br from-red-50 via-white to-red-50">
            <div className="container mx-auto px-4">
              <div className="text-center mb-16">
                <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="text-4xl font-bold mb-4 text-[#82181A]">How Booking Works</motion.h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">Our streamlined process makes booking auditoriums simple and hassle-free</p>
                <motion.div initial={{ width: 0 }} whileInView={{ width: "100px" }} transition={{ duration: 0.8, delay: 0.2 }} className="h-1 bg-red-400 mx-auto rounded-full mt-4" />
              </div>
              <div className="flex flex-wrap justify-center">
                <motion.div className="w-full md:w-10/12" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                    <div className="hidden md:block absolute top-24 left-[20%] right-[20%] h-0.5 bg-red-300" />
                    <motion.div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 text-center relative z-10" whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
                      <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">1</div>
                      <h3 className="text-xl font-semibold mb-3">Sign In</h3>
                      <p className="text-gray-500">Use your institutional credentials to access our booking platform</p>
                    </motion.div>
                    <motion.div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 text-center relative z-10" whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
                      <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">2</div>
                      <h3 className="text-xl font-semibold mb-3">Select & Request</h3>
                      <p className="text-gray-500">Choose your preferred auditorium, date and time, and submit your event details</p>
                    </motion.div>
                    <motion.div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 text-center relative z-10" whileHover={{ y: -5 }} transition={{ type: "spring", stiffness: 300 }}>
                      <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">3</div>
                      <h3 className="text-xl font-semibold mb-3">Confirmation</h3>
                      <p className="text-gray-500">Receive approval notification and prepare for your successful event</p>
                    </motion.div>
                  </div>
                </motion.div>
              </div>
              <motion.div className="text-center mt-12" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }} viewport={{ once: true }}>
                <Link to="/login" className="inline-flex items-center px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors">
                  Get Started
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
                </Link>
              </motion.div>
            </div>
          </section>
        )}

      {/* Featured Auditoriums Section - Dynamic */}
      <section className="py-24 relative overflow-hidden bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="text-4xl font-bold mb-4 text-[#82181A]"> Featured Auditoriums </motion.h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto"> Explore our premium facilities designed to accommodate various events </p>
            <motion.div initial={{ width: 0 }} whileInView={{ width: "100px" }} transition={{ duration: 0.8, delay: 0.2 }} className="h-1 bg-red-400 mx-auto rounded-full mt-4" />
          </div>
          {/* This component now handles its own data fetching */}
          <FeaturedAuditoriums isLoggedIn={isLoggedIn} userRole={userRole} />
          <div className="text-center mt-12">
            <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.6 }} viewport={{ once: true }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link to="/auditoriums" className="inline-flex items-center px-6 py-3 border-2 border-red-600 text-red-600 font-medium rounded-lg hover:bg-red-600 hover:text-white transition-colors">
                View All Auditoriums 
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

  {/* Testimonials Section Removed */}

  {/* Final CTA Section Removed */}
    </div>
  );
}

export default HomePage;