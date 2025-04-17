import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import KSAudi from "../../assets/ksaudi/ksaudi1.jpg";
import PEB from "../../assets/peb/PEB1.jpg";
import bblock from "../../assets/bblock/bblock1.jpg";
import apj from "../../assets/apj/apj1.jpg"; // Assuming you have an image for APJ Auditorium

const Auditoriums = () => {
  const auditoriums = [
    {
      name: "KS Auditorium",
      description: "A large auditorium equipped with state-of-the-art sound and lighting systems.",
      capacity: "500 Seats",
      link: "/ks-auditorium",
      image: KSAudi
    },
    {
      name: "B Block Seminar Hall",
      description: "A spacious seminar hall for academic talks and presentations.",
      capacity: "200 Seats",
      link: "/b-block-seminar-hall", // Changed from "/bblock" to match your route
      image: bblock
    },
    {
      name: "APJ Abdul Kalam Seminar Hall",
      description: "Named after the former president, this hall hosts inspiring lectures.",
      capacity: "300 Seats",
      link: "/apj-auditorium",
      image: apj
    },
    {
      name: "PEB Training Hall",
      description: "A dedicated hall for training sessions and technical workshops.",
      capacity: "150 Seats",
      link: "/peb-hall",
      image: PEB
    },
  ];

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
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-100 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Enhanced background effects */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-red-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>

      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-7xl mx-auto relative"
      >
        <div className="text-center mb-12 backdrop-blur-sm bg-white/30 p-8 rounded-2xl shadow-lg border border-white/50 hover:shadow-xl transition-shadow duration-300">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent mb-4">
            Our Auditoriums
          </h1>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto">
            Explore our world-class facilities for your next event
          </p>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8"
        >
          {auditoriums.map((auditorium, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              className="h-full"
            >
              <Link 
                to={auditorium.link}
                className="group relative backdrop-blur-md bg-white/40 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-white/50 flex flex-col h-full"
              >
                <div className="relative h-72">
                  <img
                    src={auditorium.image}
                    alt={auditorium.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent transition-opacity group-hover:opacity-75" />
                  <div className="absolute bottom-0 left-0 right-0 p-6 backdrop-blur-sm bg-white/10">
                    <h2 className="text-3xl font-bold mb-2 text-white text-shadow-lg">{auditorium.name}</h2>
                    <p className="text-sm font-semibold text-white/90 inline-block px-3 py-1 bg-red-600/80 rounded-full">
                      {auditorium.capacity}
                    </p>
                  </div>
                </div>
                <div className="p-6 backdrop-blur-sm bg-white/50 flex-grow">
                  <p className="text-gray-700 text-sm leading-relaxed">
                    {auditorium.description}
                  </p>
                  <div className="mt-4 flex items-center text-red-600 font-semibold text-sm group-hover:text-red-700">
                    Explore More
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
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Auditoriums;