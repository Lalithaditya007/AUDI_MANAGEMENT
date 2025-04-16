import React, { useState } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

import bblock1 from "../../assets/bblock/bblock1.jpg";
import bblock2 from "../../assets/bblock/bblock2.jpg";
import bblock3 from "../../assets/bblock/bblock3.jpg";
import bblock4 from "../../assets/bblock/bblock4.jpg";

const BBlockSeminarHall = () => {
  const [imageLoaded, setImageLoaded] = useState(false);

  const settings = {
    dots: true,
    infinite: true,
    speed: 300,  // Reduced from 600 to 300 for faster transitions
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 2000,  // Reduced from 4000 to 2000 for faster sliding
    arrows: true,
    adaptiveHeight: true,
  };

  const images = [
    { src: bblock1, alt: "B Block Hall Exterior" },
    { src: bblock2, alt: "B Block Hall Stage" },
    { src: bblock3, alt: "B Block Hall Seating" },
    { src: bblock4, alt: "B Block Hall Overview" },
  ];

  return (
    <div className="bg-white min-h-screen font-sans">
      {/* Hero Section */}
      <div className="relative w-full h-[400px] overflow-hidden bg-gradient-to-r from-[#82001A] to-pink-800">
        <img
          src={bblock1}
          alt="B Block Seminar Hall Hero"
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
            B Block Seminar Hall
          </h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* About Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-semibold text-[#82001A] border-b-2 border-[#82001A] inline-block pb-2 mb-4">
            About the Seminar Hall
          </h2>
          <p className="text-gray-800 text-lg leading-relaxed">
            The <strong className="text-[#82001A]">B Block Seminar Hall</strong> is a spacious and well-equipped venue designed for academic talks, presentations, and workshops. It provides a professional environment for students and faculty to engage in knowledge-sharing activities and cultural events.
          </p>
        </section>

        {/* Features Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
          <div className="bg-[#f9f9f9] p-6 rounded-xl shadow-md border-l-4 border-[#82001A]">
            <h3 className="text-xl font-bold text-[#82001A] mb-3">Key Facilities</h3>
            <ul className="list-disc pl-5 text-gray-800 space-y-2">
              <li>Seating Capacity: 300</li>
              <li>Modern Audio-Visual Equipment</li>
              <li>Air-conditioned Environment</li>
              <li>Flexible Seating Arrangements</li>
            </ul>
          </div>

          <div className="bg-[#f9f9f9] p-6 rounded-xl shadow-md border-l-4 border-[#82001A]">
            <h3 className="text-xl font-bold text-[#82001A] mb-3">Ideal For</h3>
            <ul className="list-disc pl-5 text-gray-800 space-y-2">
              <li>Guest Lectures & Talks</li>
              <li>Workshops & Presentations</li>
              <li>Faculty Development Programs</li>
              <li>Student Cultural Activities</li>
            </ul>
          </div>
        </section>

        {/* Gallery Section */}
        <section>
          <h2 className="text-2xl font-semibold text-[#82001A] mb-4">
            Seminar Hall Gallery
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

export default BBlockSeminarHall;
