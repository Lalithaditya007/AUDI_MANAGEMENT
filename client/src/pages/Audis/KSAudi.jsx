import React from "react";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

import ksaudi1 from "../../assets/ksaudi/ksaudi1.jpg";
import ksaudi2 from "../../assets/ksaudi/ksaudi2.jpg";
import ksaudi3 from "../../assets/ksaudi/ksaudi3.jpg";
import ksaudi4 from "../../assets/ksaudi/ksaudi4.jpg";

const KSAuditorium = () => {
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
    { src: ksaudi1, alt: "KS Auditorium Main" },
    { src: ksaudi2, alt: "KS Auditorium Interior" },
    { src: ksaudi3, alt: "KS Auditorium Stage" },
    { src: ksaudi4, alt: "KS Auditorium Seating" },
  ];

  return (
    <div className="bg-white min-h-screen font-sans">
      {/* Hero Section */}
      <div className="relative w-full h-[400px] bg-gradient-to-r from-[#82001A] to-pink-800 flex items-center justify-center overflow-hidden">
        {ksaudi1 && (
          <img
            src={ksaudi1}
            alt="KS Auditorium Hero"
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
        )}
        <div className="relative z-10 text-center">
          <h1 className="text-white text-4xl md:text-5xl font-bold drop-shadow-xl">
            KS Auditorium
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
            The <strong className="text-[#82001A]">KS Auditorium</strong> also known as Kode Satyanarayana Auditorium is a modern, state-of-the-art facility designed to host a variety of events including seminars, cultural programs, and academic gatherings. With a seating capacity of 500, the auditorium offers a spacious and professional setting supported by top-notch infrastructure.
          </p>
        </section>

        {/* Features Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
          <div className="bg-[#f9f9f9] p-6 rounded-xl shadow-md border-l-4 border-[#82001A]">
            <h3 className="text-xl font-bold text-[#82001A] mb-3">Key Facilities</h3>
            <ul className="list-disc pl-5 text-gray-800 space-y-2">
              <li>Seating Capacity: 500</li>
              <li>Advanced Sound & Lighting Systems</li>
              <li>Air-conditioned Environment</li>
              <li>Modern Stage Equipment</li>
            </ul>
          </div>

          <div className="bg-[#f9f9f9] p-6 rounded-xl shadow-md border-l-4 border-[#82001A]">
            <h3 className="text-xl font-bold text-[#82001A] mb-3">Suitable For</h3>
            <ul className="list-disc pl-5 text-gray-800 space-y-2">
              <li>National Seminars & Conferences</li>
              <li>Cultural Festivals & Events</li>
              <li>Guest Lectures & Talks</li>
              <li>College Celebrations</li>
            </ul>
          </div>
        </section>

        {/* Carousel Section */}
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

export default KSAuditorium;
