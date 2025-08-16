import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import KSAudi from "../../assets/ksaudi/ksaudi1.jpg";
import PEB from "../../assets/peb/PEB1.jpg";


const Auditoriums = () => {
  const [activeFilter, setActiveFilter] = useState("all");
  const [filteredAuditoriums, setFilteredAuditoriums] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch auditoriums from backend
  useEffect(() => {
    setIsLoading(true);
    fetch("/api/auditoriums")
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data)) {
          setFilteredAuditoriums(
            activeFilter === "all"
              ? data.data
              : data.data.filter(audi => audi.size === activeFilter)
          );
        } else {
          setFilteredAuditoriums([]);
        }
        setIsLoading(false);
      })
      .catch(() => {
        setFilteredAuditoriums([]);
        setIsLoading(false);
      });
  }, [activeFilter]);

  // useEffect for fetching auditoriums from backend is already present below

  // Removed unused containerVariants


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

  <div className="max-w-7xl mx-auto relative">
        <div className="text-center mb-12 backdrop-blur-sm bg-white/30 p-8 rounded-2xl shadow-lg border border-white/50 hover:shadow-xl transition-shadow duration-300">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent mb-4">
            Our Premier Venues
          </h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            Explore our world-class facilities designed for academic, cultural, and professional events. 
            Each venue offers unique features to make your next event memorable.
          </p>
          
          {/* Filter buttons */}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {filters.map((filter) => (
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
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-10">
            {filteredAuditoriums.map((auditorium, index) => (
              <div key={auditorium._id || index} className="h-full">
                <Link 
                  to={"/auditorium/" + (auditorium._id || index)}
                  className="group relative backdrop-blur-md bg-white/40 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 border border-white/50 flex flex-col h-full"
                >
                  <div className="relative h-80">
                    <img
                      src={Array.isArray(auditorium.images) && auditorium.images.length > 0 ? (auditorium.images[0].startsWith('http') ? auditorium.images[0] : `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${auditorium.images[0]}`) : KSAudi}
                      alt={auditorium.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity group-hover:opacity-75" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h2 className="text-3xl font-bold mb-2 text-white text-shadow-lg">{auditorium.name}</h2>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-semibold text-white/90 inline-block px-3 py-1 bg-red-600/80 rounded-full">
                          {auditorium.capacity} Seats
                        </span>
                        <span className="text-xs font-medium text-white/90 inline-block px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full">
                          {auditorium.size ? auditorium.size.charAt(0).toUpperCase() + auditorium.size.slice(1) : "Unknown"} Venue
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
                      {Array.isArray(auditorium.amenities) && auditorium.amenities.map((feature, i) => (
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
                      <span className="text-xs text-gray-500">{auditorium.available ? "Available for booking" : "Not available"}</span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
        
        {/* Call to action */}
  <div className="mt-16 text-center backdrop-blur-sm bg-white/50 p-8 rounded-xl border border-white/50 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Ready to Host Your Next Event?</h2>
          <p className="text-gray-700 mb-6">Our team is here to help you select the perfect venue for your needs.</p>
          <Link 
            to="/book-auditorium" 
            className="inline-block px-8 py-3 bg-red-600 text-white rounded-lg font-medium shadow-lg shadow-red-600/30 hover:bg-red-700 hover:shadow-xl hover:shadow-red-600/40 transition-all duration-300 transform hover:scale-105"
          >
            Book a Venue Now
          </Link>
  </div>
  </div>
    </div>
  );
};

export default Auditoriums;