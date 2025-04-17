import React, { useState } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

import apj1 from "../../assets/apj/apj1.jpg";
import apj2 from "../../assets/apj/apj2.jpg";
import apj3 from "../../assets/apj/apj3.jpg";
import apj4 from "../../assets/apj/apj4.jpg";

const APJAuditorium = () => {
  const [imageLoaded, setImageLoaded] = useState(false);

  const settings = {
    dots: true,
    infinite: true,
    speed: 300,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2000,
    arrows: true,
    adaptiveHeight: true,
  };

  const images = [
    { src: apj1, alt: "APJ Auditorium Main" },
    { src: apj2, alt: "APJ Auditorium Interior" },
    { src: apj3, alt: "APJ Auditorium Stage" },
    { src: apj4, alt: "APJ Auditorium Seating" },
  ];

  return (
    <div className="bg-white min-h-screen font-sans">
      {/* Hero Section */}
      <div className="relative w-full h-[400px] overflow-hidden bg-gradient-to-r from-[#82001A] to-pink-800">
        <img
          src={apj1}
          alt="APJ Auditorium Hero"
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            imageLoaded ? 'opacity-60' : 'opacity-0'
          }`}
          onLoad={() => setImageLoaded(true)}
          onError={(e) => {
            console.error("Failed to load hero image");
            e.target.style.display = 'none';
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <h1 className="text-white text-4xl md:text-5xl font-bold drop-shadow-xl z-10">
            APJ Abdul Kalam Auditorium
          </h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* About Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-semibold text-[#82001A] border-b-2 border-[#82001A] inline-block pb-2 mb-4">
            About the Auditorium
          </h2>
          <p className="text-gray-800 text-lg leading-relaxed">
            The <strong className="text-[#82001A]">APJ Abdul Kalam Auditorium</strong> is a modern facility designed 
            to host a variety of events, including conferences, seminars, and cultural programs. Named after India's 
            beloved former President, this auditorium represents excellence and innovation in academic facilities.
          </p>
        </section>

        {/* Features Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
          <div className="bg-[#f9f9f9] p-6 rounded-xl shadow-md border-l-4 border-[#82001A]">
            <h3 className="text-xl font-bold text-[#82001A] mb-3">Key Facilities</h3>
            <ul className="list-disc pl-5 text-gray-800 space-y-2">
              <li>Seating Capacity: 300</li>
              <li>High-Quality Audio-Visual Systems</li>
              <li>Fully Air-Conditioned</li>
              <li>Spacious Stage with Advanced Lighting</li>
            </ul>
          </div>

          <div className="bg-[#f9f9f9] p-6 rounded-xl shadow-md border-l-4 border-[#82001A]">
            <h3 className="text-xl font-bold text-[#82001A] mb-3">Ideal For</h3>
            <ul className="list-disc pl-5 text-gray-800 space-y-2">
              <li>Academic Conferences</li>
              <li>Technical Seminars</li>
              <li>Cultural Events</li>
              <li>Guest Lectures</li>
            </ul>
          </div>
        </section>

        {/* Gallery Section */}
        <section>
          <h2 className="text-2xl font-semibold text-[#82001A] mb-4">
            Auditorium Gallery
          </h2>
          <div className="rounded-xl overflow-hidden shadow-md border">
            <Slider {...settings}>
              {images.map((image, index) => (
                <div key={index}>
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-[450px] object-cover"
                  />
                </div>
              ))}
            </Slider>
          </div>
        </section>
      </div>
    </div>
  );
};

export default APJAuditorium;