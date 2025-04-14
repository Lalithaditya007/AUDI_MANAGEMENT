import React from 'react';
import Events from '../components/events.jsx';
import clg from '../assets/clg.jpg';
import { motion } from 'framer-motion';

const HomePage = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <header className="relative min-h-[90vh] flex items-center justify-center">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${clg})`,
          }}
        >
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/50 to-black/70" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight">
              A Space to Chill,
              <span className="text-red-500"> A Place to Learn</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 font-light max-w-3xl mx-auto">
              Where Moments Turn into Memories
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 justify-center mt-8">
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="/auditoriums"
                className="px-8 py-3 bg-red-600 text-white rounded-full font-semibold hover:bg-red-700 transition-colors duration-300"
              >
                Explore Auditoriums
              </motion.a>
              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="/login"
                className="px-8 py-3 bg-white/10 backdrop-blur-sm text-white rounded-full font-semibold hover:bg-white/20 transition-colors duration-300 border border-white/30"
              >
                Book Now
              </motion.a>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg 
            className="w-6 h-6 text-white"
            fill="none" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </div>
      </header>

      {/* Events Section with Enhanced Styling */}
      <section className="py-20 relative overflow-hidden">
        {/* Background gradient updated for better contrast */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-red-800 to-gray-900">
          <div className="absolute inset-0 bg-[url('/src/assets/pattern.png')] opacity-5"></div>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="container mx-auto px-4 relative z-10"
        >
          <div className="text-center mb-12">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-4xl md:text-5xl font-bold mb-4"
            >
              {/* Updated gradient colors for better visibility */}
              <span className="bg-gradient-to-r from-white via-red-100 to-white bg-clip-text text-transparent">
                Current & Upcoming Events
              </span>
            </motion.h2>
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "100px" }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="h-1 bg-red-400 mx-auto rounded-full"
            />
          </div>
          
          {/* Updated container styling with better contrast */}
          <div className="max-w-4xl mx-auto backdrop-blur-md bg-white/10 rounded-2xl p-6 shadow-2xl border border-white/20">
            <Events />
          </div>
          
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-8 text-center"
          >
            {/* Updated link colors for better visibility */}
            <a 
              href="/calendar" 
              className="inline-flex items-center gap-2 text-white hover:text-red-200 transition-colors duration-300 group"
            >
              View Full Calendar
              <svg 
                className="w-4 h-4 transform transition-transform group-hover:translate-x-1" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth="2" 
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {/* Feature 1 */}
            <div className="text-center p-6 rounded-xl bg-red-50 hover:bg-red-100 transition-colors duration-300">
              <div className="text-red-600 mb-4">
                <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Modern Facilities</h3>
              <p className="text-gray-600">State-of-the-art equipment and comfortable seating</p>
            </div>

            {/* Feature 2 */}
            <div className="text-center p-6 rounded-xl bg-red-50 hover:bg-red-100 transition-colors duration-300">
              <div className="text-red-600 mb-4">
                <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Easy Booking</h3>
              <p className="text-gray-600">Simple and efficient booking process</p>
            </div>

            {/* Feature 3 */}
            <div className="text-center p-6 rounded-xl bg-red-50 hover:bg-red-100 transition-colors duration-300">
              <div className="text-red-600 mb-4">
                <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Technical Support</h3>
              <p className="text-gray-600">Professional support for all events</p>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
