import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import KSAudi from "../../assets/ksaudi/ksaudi1.jpg";
import PEB from "../../assets/peb/PEB1.jpg";
import bblock from "../../assets/bblock/bblock1.jpg";
import apj from "../../assets/apj/apj1.jpg"; // Assuming you have an image for APJ Auditorium

const Auditoriums = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [filteredAuditoriums, setFilteredAuditoriums] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const auditoriums = [
    {
      name: "KS Auditorium",
      description: "A large auditorium equipped with state-of-the-art sound and lighting systems. Perfect for conferences, cultural events, and large gatherings.",
      capacity: "500 Seats",
      link: "/ks-auditorium",
      image: KSAudi,
      category: "large",
      features: ["Projector", "Sound System", "Air Conditioning", "Stage Lighting"]
    },
    {
      name: "B Block Seminar Hall",
      description: "A spacious seminar hall for academic talks and presentations. Ideal for workshops, training sessions, and department meetings.",
      capacity: "200 Seats",
      link: "/b-block-seminar-hall",
      image: bblock,
      category: "medium",
      features: ["Projector", "Whiteboard", "Air Conditioning"]
    },
    {
      name: "APJ Abdul Kalam Seminar Hall",
      description: "Named after the former president, this hall hosts inspiring lectures and prestigious events. Perfect for special gatherings and VIP events.",
      capacity: "300 Seats",
      link: "/apj-auditorium",
      image: apj,
      category: "medium",
      features: ["Projector", "Sound System", "Air Conditioning", "Multi-level Seating"]
    },
    {
      name: "PEB Training Hall",
      description: "A dedicated hall for training sessions and technical workshops. Equipped with modern facilities to enhance learning experience.",
      capacity: "150 Seats",
      link: "/peb-hall",
      image: PEB,
      category: "small",
      features: ["Projector", "Computers", "Whiteboard"]
    },
  ];

  useEffect(() => {
    // Simulating data loading
    setTimeout(() => {
      setIsLoading(false);
    }, 800);
    
    if (activeFilter === "all") {
      setFilteredAuditoriums(auditoriums);
    } else {
      setFilteredAuditoriums(auditoriums.filter(audi => audi.category === activeFilter));
    }
  }, [activeFilter]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  const filters = [
    { name: "All", value: "all" },
    { name: "Large (300+)", value: "large" },
    { name: "Medium (200-300)", value: "medium" },
    { name: "Small (<200)", value: "small" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Enhanced background effects */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-red-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto relative"
      >
        <div className="text-center mb-12 backdrop-blur-sm bg-white/30 p-8 rounded-2xl shadow-lg border border-white/50 hover:shadow-xl transition-shadow duration-300">
          <motion.h1 
            className="text-5xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent mb-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, type: "spring" }}
          >
            Our Premier Venues
          </motion.h1>
          <motion.p 
            className="text-xl text-gray-700 max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            Explore our world-class facilities designed for academic, cultural, and professional events. 
            Each venue offers unique features to make your next event memorable.
          </motion.p>
          
          {/* Filter buttons */}
          <motion.div 
            className="mt-8 flex flex-wrap justify-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            {filters.map((filter, index) => (
              <button
                key={filter.value}
                onClick={() => setActiveFilter(filter.value)}
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeFilter === filter.value 
                    ? "bg-red-600 text-white shadow-lg shadow-red-500/30" 
                    : "bg-white/70 hover:bg-white text-gray-700 hover:shadow-md"
                }`}
              >
                {filter.name}
              </button>
            ))}
          </motion.div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-600"></div>
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-10"
          >
            {filteredAuditoriums.map((auditorium, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ scale: 1.03 }}
                className="h-full"
              >
                <Link 
                  to={auditorium.link}
                  className="group relative backdrop-blur-md bg-white/40 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-white/50 flex flex-col h-full"
                >
                  <div className="relative h-80">
                    <img
                      src={auditorium.image}
                      alt={auditorium.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity group-hover:opacity-75" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h2 className="text-3xl font-bold mb-2 text-white text-shadow-lg">{auditorium.name}</h2>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-white/90 inline-block px-3 py-1 bg-red-600/80 rounded-full">
                          {auditorium.capacity}
                        </span>
                        <span className="text-xs font-medium text-white/90 inline-block px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full">
                          {auditorium.category.charAt(0).toUpperCase() + auditorium.category.slice(1)} Venue
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 backdrop-blur-sm bg-white/50 flex-grow flex flex-col">
                    <p className="text-gray-700 mb-4 flex-grow">
                      {auditorium.description}
                    </p>
                    
                    {/* Feature pills */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {auditorium.features.map((feature, i) => (
                        <span key={i} className="bg-white/70 text-gray-700 text-xs px-2 py-1 rounded-full border border-gray-200">
                          {feature}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-red-600 font-semibold group-hover:text-red-700 transition-colors">
                        Explore Details
                        <svg 
                          className="w-5 h-5 ml-2 transform transition-transform group-hover:translate-x-3" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth="2" 
                            d="M13 7l5 5m0 0l-5 5m5-5H6"
                          />
                        </svg>
                      </div>
                      <span className="text-xs text-gray-500">Available for booking</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
        
        {/* Call to action */}
        <motion.div 
          className="mt-16 text-center backdrop-blur-sm bg-white/50 p-8 rounded-xl border border-white/50 shadow-lg"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Ready to Host Your Next Event?</h2>
          <p className="text-gray-700 mb-6">Our team is here to help you select the perfect venue for your needs.</p>
          <Link 
            to="/book-auditorium" 
            className="inline-block px-8 py-3 bg-red-600 text-white rounded-lg font-medium shadow-lg shadow-red-600/30 hover:bg-red-700 hover:shadow-xl hover:shadow-red-600/40 transition-all duration-300 transform hover:scale-105"
          >
            Book a Venue Now
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Auditoriums;