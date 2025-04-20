import React from 'react';
import { Link } from 'react-router-dom';
import {
  FaFacebookF,
  FaInstagram,
  FaTwitter,
  FaLinkedinIn,
  FaYoutube
} from 'react-icons/fa';
import logo from '../assets/logo.png';

const Footer = () => {
  return (
    <footer className="bg-[#121212] text-white text-sm">
      <div className="max-w-[1400px] mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Contact Info */}
          <div className='ml-20'>
            <div className="flex items-center space-x-4 mb-4">
              <img src={logo} alt="VNRVJIET Logo" className="h-15" />
             
            </div>
            <h3 className="text-red-500 font-semibold mb-2">Contact Us</h3>
            <p className="text-gray-300 leading-relaxed">
              VNR Vignana Jyothi Institute of Engineering & Technology<br />
              Bachupally, Hyderabad, Telangana - 500090
            </p>
            <p className="mt-2 text-gray-400">Phone: +91-040-23042758/59/60</p>
            <p className="text-gray-400">Email: info@vnrvjiet.ac.in</p>
            <div className="flex gap-4 mt-4 text-lg text-gray-400">
              <a href="https://facebook.com/vnrvjiet" target="_blank" rel="noopener noreferrer" className="hover:text-red-500"><FaFacebookF /></a>
              <a href="https://instagram.com/vnrvjiet" target="_blank" rel="noopener noreferrer" className="hover:text-red-500"><FaInstagram /></a>
              <a href="https://twitter.com/vnrvjiet" target="_blank" rel="noopener noreferrer" className="hover:text-red-500"><FaTwitter /></a>
              <a href="https://linkedin.com/school/vnrvjiet" target="_blank" rel="noopener noreferrer" className="hover:text-red-500"><FaLinkedinIn /></a>
              <a href="https://youtube.com/vnrvjiet" target="_blank" rel="noopener noreferrer" className="hover:text-red-500"><FaYoutube /></a>
            </div>
          </div>

          {/* Our Venues */}
          <div className="ml-40">
            <h3 className="text-red-500 font-semibold mb-4 ">Our Venues</h3>
            <ul className="space-y-2 text-gray-300">
              <li><Link to="/ks-auditorium" className="hover:text-red-400">KS Auditorium</Link></li>
              <li><Link to="/b-block-seminar-hall" className="hover:text-red-400">B Block Seminar Hall</Link></li>
              <li><Link to="/apj-auditorium" className="hover:text-red-400">APJ Abdul Kalam Auditorium</Link></li>
              <li><Link to="/peb-hall" className="hover:text-red-400">PEB Training Hall</Link></li>
            </ul>
          </div>

          {/* Quick Links */}
          <div className='ml-40'>
            <h3 className="text-red-500 font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-gray-300">
              <li><Link to="/book-auditorium" className="hover:text-red-400">Book Auditorium</Link></li>
              <li><Link to="/booking-history" className="hover:text-red-400">Booking History</Link></li>
              <li><Link to="/login" className="hover:text-red-400">Login</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Line */}
        <div className="mt-8 pt-4 border-t border-gray-700 text-center text-gray-500">
          &copy; {new Date().getFullYear()} VNR VJIET - Auditorium Management System. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
