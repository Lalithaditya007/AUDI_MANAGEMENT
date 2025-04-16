import React, { useState } from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

import peb1 from "../../assets/peb/PEB1.jpg";
import peb2 from "../../assets/peb/PEB2.jpg";
import peb3 from "../../assets/peb/PEB3.jpg";
import peb4 from "../../assets/peb/PEB4.jpg";

const PEBHall = () => {
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
    { src: peb1, alt: "PEB Training Hall Main" },
    { src: peb2, alt: "PEB Training Hall Interior" },
    { src: peb3, alt: "PEB Training Hall Stage" },
    { src: peb4, alt: "PEB Training Hall Seating" },
  ];

  return (
    <div className="bg-white min-h-screen font-sans">
      {/* Hero Section */}
      <div className="relative w-full h-[400px] overflow-hidden bg-gradient-to-r from-[#82001A] to-pink-800">
        <img
          src={peb1}
          alt="PEB Training Hall Hero"
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
            PEB Training Hall
          </h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* About Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-semibold text-[#82001A] border-b-2 border-[#82001A] inline-block pb-2 mb-4">
            About the Training Hall
          </h2>
          <p className="text-gray-800 text-lg leading-relaxed">
            The <strong className="text-[#82001A]">PEB Training Hall</strong> is a versatile space designed for training sessions, workshops, and small-scale events. It is equipped with modern facilities to ensure a productive and comfortable environment for participants.
          </p>
        </section>

        {/* Features Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
          <div className="bg-[#f9f9f9] p-6 rounded-xl shadow-md border-l-4 border-[#82001A]">
            <h3 className="text-xl font-bold text-[#82001A] mb-3">Key Facilities</h3>
            <ul className="list-disc pl-5 text-gray-800 space-y-2">
              <li>Seating Capacity: 150</li>
              <li>Modern Training Equipment</li>
              <li>Fully Air-Conditioned</li>
              <li>Flexible Seating Arrangements</li>
            </ul>
          </div>

          <div className="bg-[#f9f9f9] p-6 rounded-xl shadow-md border-l-4 border-[#82001A]">
            <h3 className="text-xl font-bold text-[#82001A] mb-3">Ideal For</h3>
            <ul className="list-disc pl-5 text-gray-800 space-y-2">
              <li>Training Sessions</li>
              <li>Workshops & Seminars</li>
              <li>Group Discussions</li>
              <li>Professional Development</li>
            </ul>
          </div>
        </section>

        {/* Gallery Section */}
        <section>
          <h2 className="text-2xl font-semibold text-[#82001A] mb-4">
            Training Hall Gallery
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

export default PEBHall;