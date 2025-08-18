import React, { useEffect, useState } from 'react';
import Slider from 'react-slick';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { useParams, Link } from 'react-router-dom';
import NotFound from '../NotFound';

const AuditoriumDetails = ({ isLoggedIn, userRole }) => {
  const { id } = useParams();
  const [auditorium, setAuditorium] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`/api/auditoriums/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch auditorium');
        return res.json();
      })
      .then(data => {
        if (data.success && data.data) {
          setAuditorium(data.data);
        } else {
          setError('Auditorium not found');
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-600"></div></div>;
  if (error || !auditorium) return <NotFound />;

  // Carousel settings
  const settings = {
    dots: true,
    infinite: true,
    speed: 350,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true,
    adaptiveHeight: true,
    autoplay: true,
    autoplaySpeed: 1200,
  };

  return (
  <div className="max-w-3xl mx-auto py-12 px-4 mt-20">
      <h1 className="text-4xl font-bold mb-4 text-[#82181A]">{auditorium.name}</h1>
      <div className="mb-6">
        {Array.isArray(auditorium.images) && auditorium.images.length > 0 ? (
          <Slider {...settings}>
            {auditorium.images.map((img, idx) => (
              <div key={idx} className="flex justify-center items-center">
                <img
                  src={img.startsWith('http') ? img : `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${img}`}
                  alt={`Auditorium ${idx + 1}`}
                  className="w-full h-64 object-cover rounded-xl shadow-lg"
                />
              </div>
            ))}
          </Slider>
        ) : (
          <div className="w-full h-64 bg-gray-200 flex items-center justify-center rounded-xl text-gray-400">No Image</div>
        )}
      </div>
      <p className="text-lg text-gray-700 mb-4">{auditorium.description}</p>
      <div className="mb-4">
        <span className="font-semibold">Capacity:</span> {auditorium.capacity}
      </div>
      <div className="mb-4">
        <span className="font-semibold">Location:</span> {auditorium.location}
      </div>
      <div className="mb-4">
        <span className="font-semibold">Amenities:</span> {Array.isArray(auditorium.amenities) ? auditorium.amenities.join(', ') : 'N/A'}
      </div>
      <div className="mb-4">
        <span className="font-semibold">Contact:</span> {auditorium.contactInfo}
      </div>
      
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 mt-8">
        {isLoggedIn && userRole === 'user' && (
          <Link 
            to={`/book-auditorium?auditorium=${auditorium._id}`}
            className="inline-flex items-center justify-center px-8 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-semibold hover:from-red-700 hover:to-red-800 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Book This Auditorium
          </Link>
        )}
        <Link 
          to="/auditoriums" 
          className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors border border-gray-300"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Auditoriums
        </Link>
      </div>
    </div>
  );
};

export default AuditoriumDetails;
