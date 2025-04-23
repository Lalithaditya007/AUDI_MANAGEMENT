import React from 'react';
import Events from '../components/Events.jsx';
import clg from '../assets/clg.jpg';
import ksaudi from '../assets/ksaudi/ksaudi1.jpg';
import bblock from '../assets/bblock/bblock1.jpg';
import PEB from '../assets/peb/peb1.jpg';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom'; // Import Link if you prefer it over <a>

// Accept props isLoggedIn and userRole
const HomePage = ({ isLoggedIn, userRole }) => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <header className="relative min-h-[90vh] flex items-center justify-center">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${clg})` }}
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
              <span className="text-red-600 font-extrabold"> A Place to Learn</span>
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

              {/* Conditional "Book Now" Button */}
              {!(isLoggedIn && userRole === 'admin') && (
                  <motion.a
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    href={isLoggedIn ? "/book-auditorium" : "/login"}
                    className="px-8 py-3 bg-white/10 backdrop-blur-sm text-white rounded-full font-semibold hover:bg-white/20 transition-colors duration-300 border border-white/30"
                  >
                    Book Now
                  </motion.a>
              )}
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
           {/* ... SVG ... */}
            <svg className="w-6 h-6 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
        </div>
      </header>

      {/* Events Section */}
      <section className="py-20 relative overflow-hidden">
        {/* ... Events section content ... */}
        <div className="absolute inset-0 bg-gray-50/90"><div className="absolute inset-0 bg-[url('/src/assets/pattern.png')] opacity-10 mix-blend-overlay"></div></div>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="w-[90%] mx-auto px-4 relative z-10">
           <div className="text-center mb-12"><motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="text-4xl md:text-5xl font-bold mb-4"><span className="text-[#82181A]"> Current & Upcoming Events </span></motion.h2><motion.div initial={{ width: 0 }} whileInView={{ width: "100px" }} transition={{ duration: 0.8, delay: 0.4 }} className="h-1 bg-red-400 mx-auto rounded-full" /></div>
           <div className="w-full mx-auto backdrop-blur-md bg-white/10 rounded-2xl p-6 shadow-2xl border-2 border-[#82181A]/20"><Events /></div>
           <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.6 }} className="mt-8 text-center"></motion.div>
        </motion.div>
      </section>

      {/* --- MODIFIED: Conditional "How It Works" Section --- */}
      {/* Only render this section if the user is NOT an admin */}
      {!(isLoggedIn && userRole === 'admin') && (
          <section className="py-20 bg-gradient-to-br from-red-50 via-white to-red-50">
            <div className="container mx-auto px-4">
              <div className="text-center mb-16">
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  className="text-4xl font-bold mb-4 text-[#82181A]"
                >
                  How Booking Works
                </motion.h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Our streamlined process makes booking auditoriums simple and hassle-free
                </p>
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: "100px" }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="h-1 bg-red-400 mx-auto rounded-full mt-4"
                />
              </div>

              <div className="flex flex-wrap justify-center">
                <motion.div
                  className="w-full md:w-10/12"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ duration: 0.8 }}
                  viewport={{ once: true }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
                    {/* Connection Line (Only on desktop) */}
                    <div className="hidden md:block absolute top-24 left-[20%] right-[20%] h-0.5 bg-red-300" />

                    {/* Step 1 */}
                    <motion.div
                      className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 text-center relative z-10"
                      whileHover={{ y: -5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">1</div>
                      <h3 className="text-xl font-semibold mb-3">Sign In</h3>
                      <p className="text-gray-500">Use your institutional credentials to access our booking platform</p>
                    </motion.div>

                    {/* Step 2 */}
                    <motion.div
                      className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 text-center relative z-10"
                      whileHover={{ y: -5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">2</div>
                      <h3 className="text-xl font-semibold mb-3">Select & Request</h3>
                      <p className="text-gray-500">Choose your preferred auditorium, date and time, and submit your event details</p>
                    </motion.div>

                    {/* Step 3 */}
                    <motion.div
                      className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 text-center relative z-10"
                      whileHover={{ y: -5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">3</div>
                      <h3 className="text-xl font-semibold mb-3">Confirmation</h3>
                      <p className="text-gray-500">Receive approval notification and prepare for your successful event</p>
                    </motion.div>
                  </div>
                </motion.div>
              </div>

              <motion.div
                className="text-center mt-12"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                viewport={{ once: true }}
              >
                <a href="/login" className="inline-flex items-center px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors">
                  Get Started
                  <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>
                </a>
              </motion.div>
            </div>
          </section>
      )}
      {/* --- END MODIFICATION --- */}


      {/* Featured Auditoriums Section */}
      <section className="py-24 relative overflow-hidden bg-white">
         {/* ... Featured auditoriums content ... */}
         <div className="container mx-auto px-4">
            <div className="text-center mb-16"><motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="text-4xl font-bold mb-4 text-[#82181A]"> Featured Auditoriums </motion.h2><p className="text-lg text-gray-600 max-w-2xl mx-auto"> Explore our premium facilities designed to accommodate various events </p><motion.div initial={{ width: 0 }} whileInView={{ width: "100px" }} transition={{ duration: 0.8, delay: 0.2 }} className="h-1 bg-red-400 mx-auto rounded-full mt-4" /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{/* Cards */} <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} viewport={{ once: true }} whileHover={{ y: -8 }} className="bg-white rounded-xl overflow-hidden shadow-lg group"> <div className="h-64 overflow-hidden relative"> <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" /> <img src={ksaudi} alt="KS Auditorium" className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"/> <div className="absolute bottom-0 left-0 right-0 p-5 z-20"> <h3 className="text-2xl font-bold text-white">KS Auditorium</h3> <p className="text-white/80 text-sm">500 Seats</p> </div> </div> <div className="p-6"> <p className="text-gray-600 mb-4">Our flagship auditorium with state-of-the-art AV equipment and ample seating for large events.</p> <a href="/ks-auditorium" className="text-red-600 font-medium flex items-center group-hover:text-red-700"> View Details <svg className="w-4 h-4 ml-2 transform transition-transform group-hover:translate-x-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg> </a> </div> </motion.div> <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} viewport={{ once: true }} whileHover={{ y: -8 }} className="bg-white rounded-xl overflow-hidden shadow-lg group"> <div className="h-64 overflow-hidden relative"> <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" /> <img src={bblock} alt="B Block Seminar Hall" className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"/> <div className="absolute bottom-0 left-0 right-0 p-5 z-20"> <h3 className="text-2xl font-bold text-white">B Block Seminar Hall</h3> <p className="text-white/80 text-sm">200 Seats</p> </div> </div> <div className="p-6"> <p className="text-gray-600 mb-4">A versatile space perfect for workshops, seminars and academic presentations.</p> <a href="/b-block-seminar-hall" className="text-red-600 font-medium flex items-center group-hover:text-red-700"> View Details <svg className="w-4 h-4 ml-2 transform transition-transform group-hover:translate-x-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg> </a> </div> </motion.div> <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }} viewport={{ once: true }} whileHover={{ y: -8 }} className="bg-white rounded-xl overflow-hidden shadow-lg group"> <div className="h-64 overflow-hidden relative"> <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" /> <img src={PEB} alt="PEB Training Hall" className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"/> <div className="absolute bottom-0 left-0 right-0 p-5 z-20"> <h3 className="text-2xl font-bold text-white">PEB Training Hall</h3> <p className="text-white/80 text-sm">150 Seats</p> </div> </div> <div className="p-6"> <p className="text-gray-600 mb-4">A dedicated hall for training sessions, technical workshops and small conferences.</p> <a href="/peb-hall" className="text-red-600 font-medium flex items-center group-hover:text-red-700"> View Details <svg className="w-4 h-4 ml-2 transform transition-transform group-hover:translate-x-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg> </a> </div> </motion.div> </div>
             <div className="text-center mt-12"><motion.a initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.6 }} viewport={{ once: true }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} href="/auditoriums" className="inline-flex items-center px-6 py-3 border-2 border-red-600 text-red-600 font-medium rounded-lg hover:bg-red-600 hover:text-white transition-colors"> View All Auditoriums <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg> </motion.a></div>
         </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-red-50 relative overflow-hidden">
         {/* ... Testimonials section content ... */}
         <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-white to-transparent"></div><div className="absolute bottom-0 left-0 w-full h-20 bg-gradient-to-t from-white to-transparent"></div><div className="absolute -top-10 -left-10 w-40 h-40 bg-red-100 rounded-full opacity-60"></div><div className="absolute -bottom-10 -right-10 w-60 h-60 bg-red-100 rounded-full opacity-60"></div>
         <div className="container mx-auto px-4 relative z-10"><div className="text-center mb-16"><motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="text-4xl font-bold mb-4 text-[#82181A]"> What People Say </motion.h2><p className="text-lg text-gray-600 max-w-2xl mx-auto"> Feedback from departments and organizations that used our facilities </p><motion.div initial={{ width: 0 }} whileInView={{ width: "100px" }} transition={{ duration: 0.8, delay: 0.2 }} className="h-1 bg-red-400 mx-auto rounded-full mt-4" /></div><div className="grid grid-cols-1 md:grid-cols-3 gap-8">{/* Testimonials */} <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} viewport={{ once: true }} className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 relative"> <div className="absolute top-4 right-4 text-red-100 text-6xl font-serif">❞</div> <p className="text-gray-600 italic mb-6 relative z-10"> "The booking process was incredibly simple and the technical support team was very helpful during our tech conference. Will definitely book again!" </p> <div className="flex items-center"> <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold text-xl"> CS </div> <div className="ml-4"> <h4 className="font-semibold">Computer Science Dept.</h4> <p className="text-sm text-gray-500">Annual Tech Summit</p> </div> </div> </motion.div> <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} viewport={{ once: true }} className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 relative"> <div className="absolute top-4 right-4 text-red-100 text-6xl font-serif">❞</div> <p className="text-gray-600 italic mb-6 relative z-10"> "The KS Auditorium was perfect for our cultural festival. The acoustics and lighting setup exceeded our expectations. Thank you for the smooth experience!" </p> <div className="flex items-center"> <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold text-xl"> CA </div> <div className="ml-4"> <h4 className="font-semibold">Cultural Association</h4> <p className="text-sm text-gray-500">Annual Cultural Fest</p> </div> </div> </motion.div> <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }} viewport={{ once: true }} className="bg-white p-8 rounded-xl shadow-lg border border-gray-100 relative"> <div className="absolute top-4 right-4 text-red-100 text-6xl font-serif">❞</div> <p className="text-gray-600 italic mb-6 relative z-10"> "As an alumni association, we host regular events, and the institution's booking portal has made reservation process seamless. Excellent facilities and staff support!" </p> <div className="flex items-center"> <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 font-bold text-xl"> AA </div> <div className="ml-4"> <h4 className="font-semibold">Alumni Association</h4> <p className="text-sm text-gray-500">Annual Reunion</p> </div> </div> </motion.div> </div></div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 bg-gradient-to-br from-red-700 to-red-900 relative overflow-hidden">
         {/* ... Final CTA content ... */}
         <div className="absolute top-0 left-0 w-full h-40 bg-[url('/src/assets/pattern.png')] opacity-5"></div><div className="absolute -bottom-20 -right-20 w-80 h-80 bg-red-800 rounded-full opacity-30"></div><div className="absolute -bottom-10 -left-10 w-40 h-40 bg-red-800 rounded-full opacity-30"></div>
         <div className="container mx-auto px-4 relative z-10"><div className="max-w-4xl mx-auto text-center"><motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="text-4xl md:text-5xl font-bold mb-6 text-white"> Ready to Host Your Next Event? </motion.h2><motion.p initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} viewport={{ once: true }} className="text-xl text-red-100 mb-10 max-w-3xl mx-auto"> From department seminars to cultural celebrations, our auditoriums provide the perfect setting for your campus events. Book now and make your event memorable! </motion.p><motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.4 }} viewport={{ once: true }} className="flex flex-wrap gap-6 justify-center">{!(isLoggedIn && userRole === 'admin') && (<motion.a whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} href={isLoggedIn ? "/book-auditorium" : "/login"} className="px-8 py-4 bg-white text-red-800 rounded-lg font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-300"> Book an Auditorium </motion.a>)} <motion.a whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} href="/auditoriums" className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-bold text-lg shadow-lg hover:bg-white/10 transition-all duration-300"> Explore Options </motion.a></motion.div></div></div>
      </section>
    </div>
  );
};

export default HomePage;