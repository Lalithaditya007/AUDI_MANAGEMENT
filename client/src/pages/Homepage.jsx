import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Events from '../components/Events.jsx';
import clg from '../assets/clg.jpg';
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
                src={Array.isArray(auditorium.images) && auditorium.images.length > 0 ? (auditorium.images[0].startsWith('http') ? auditorium.images[0] : `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${auditorium.images[0]}`) : ksaudi}
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
  return (
    <div className="min-h-screen flex flex-col">
    {/* Hero Section */}
  <header id="hero" className="relative min-h-[100vh] pb-[75px] flex items-center justify-center">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          // CORRECTED: Used backticks (`) for the backgroundImage style to create a valid URL string
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

      {/* Events Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gray-50/90"><div className="absolute inset-0 bg-[url('/src/assets/pattern.png')] opacity-10 mix-blend-overlay"></div></div>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="w-[90%] mx-auto px-4 relative z-10">
           <div className="text-center mb-12"><motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="text-4xl md:text-5xl font-bold mb-4"><span className="text-[#82181A]"> Current & Upcoming Events </span></motion.h2><motion.div initial={{ width: 0 }} whileInView={{ width: "100px" }} transition={{ duration: 0.8, delay: 0.4 }} className="h-1 bg-red-400 mx-auto rounded-full" /></div>
           <div className="w-full mx-auto backdrop-blur-md bg-white/10 rounded-2xl p-6 shadow-2xl border-2 border-[#82181A]/20"><Events /></div>
           <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.6 }} className="mt-8 text-center"></motion.div>
        </motion.div>
      </section>

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