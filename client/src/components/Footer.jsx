import React from 'react';
import {
  FaInstagram,
  FaLinkedinIn,
  FaYoutube,
  FaSnapchatGhost
} from 'react-icons/fa';
import logo from '../assets/logo.png';

const Footer = () => {
  return (
    <footer className="bg-[#121212] text-white text-sm w-full">
      <div className="max-w-[1400px] mx-auto px-6 py-5 flex flex-col md:flex-row md:items-start md:justify-between gap-8">
        {/* Left: Logo with Address below */}
        <div className="flex flex-col items-start">
          <img src={logo} alt="VNRVJIET Logo" className="h-16 w-auto" />
          <p className="mt-3 text-gray-300 leading-relaxed">
            VNR Vignana Jyothi Institute of Engineering & Technology<br />
            Bachupally, Hyderabad, Telangana - 500090
          </p>
        </div>

        {/* Right: Contact heading, details, then social */}
        <div className="md:ml-8">
          <h3 className="text-red-500 font-semibold mb-2">Contact Us</h3>
          <div className="text-gray-400">
            <p>Phone: +91-040-23042758/59/60</p>
            <p>Email: info@vnrvjiet.ac.in</p>
          </div>
          <div className="mt-4 flex flex-row items-center gap-4 text-2xl text-gray-400">
            <a
              href="https://www.instagram.com/vnrvjiet.hyd?igsh=MXM0ejBqbmN2Z3NwNQ=="
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-red-500 flex items-center justify-center w-10 h-10 rounded-full bg-[#232323] transition-colors"
            >
              <FaInstagram />
            </a>
            <a
              href="https://www.linkedin.com/school/vnrvjiethyd/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-red-500 flex items-center justify-center w-10 h-10 rounded-full bg-[#232323] transition-colors"
            >
              <FaLinkedinIn />
            </a>
            <a
              href="https://youtube.com/@vnrvjiethyd?si=zMa14QzHjm_UveAe"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-red-500 flex items-center justify-center w-10 h-10 rounded-full bg-[#232323] transition-colors"
            >
              <FaYoutube />
            </a>
            <a
              href="https://www.snapchat.com/add/vnrvjiet.hyd?share_id=50ReA3S3XTU&locale=en-US "
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-yellow-400 flex items-center justify-center w-10 h-10 rounded-full bg-[#232323] transition-colors"
            >
              <FaSnapchatGhost />
            </a>
          </div>
        </div>
      </div>
      {/* Bottom Line */}
      <div className=" border-t border-gray-700 text-center text-gray-500">
        &copy; {new Date().getFullYear()} VNR VJIET - Auditorium Management System. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
