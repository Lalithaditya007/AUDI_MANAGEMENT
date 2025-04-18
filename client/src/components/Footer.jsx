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
    <footer className="bg-[#1a1a1a] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* College Info */}
          <div>
            <img
              src={logo}
              alt="VNRVJIET Logo"
              className="h-16 mb-4"
            />
            <h3 className="text-lg font-bold text-red-500">Contact Us</h3>
            <p className="text-sm leading-relaxed mt-2">
              VNR Vignana Jyothi Institute of Engineering & Technology<br />
              Bachupally, Hyderabad, Telangana - 500090
            </p>
            <p className="mt-4 text-sm">Phone: +91-040-23042758/59/60</p>
            <p className="text-sm">Email: info@vnrvjiet.ac.in</p>
            <div className="flex gap-4 mt-4 text-xl">
              <a href="https://facebook.com/vnrvjiet" target="_blank" rel="noopener noreferrer" className="hover:text-red-500"><FaFacebookF /></a>
              <a href="https://instagram.com/vnrvjiet" target="_blank" rel="noopener noreferrer" className="hover:text-red-500"><FaInstagram /></a>
              <a href="https://twitter.com/vnrvjiet" target="_blank" rel="noopener noreferrer" className="hover:text-red-500"><FaTwitter /></a>
              <a href="https://linkedin.com/school/vnrvjiet" target="_blank" rel="noopener noreferrer" className="hover:text-red-500"><FaLinkedinIn /></a>
              <a href="https://youtube.com/vnrvjiet" target="_blank" rel="noopener noreferrer" className="hover:text-red-500"><FaYoutube /></a>
            </div>
          </div>

          {/* Our Venues */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-red-500">Our Venues</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/ks-auditorium" className="hover:text-red-300">KS Auditorium</Link>
              </li>
              <li>
                <Link to="/b-block-seminar-hall" className="hover:text-red-300">B Block Seminar Hall</Link>
              </li>
              <li>
                <Link to="/apj-auditorium" className="hover:text-red-300">APJ Abdul Kalam Auditorium</Link>
              </li>
              <li>
                <Link to="/peb-hall" className="hover:text-red-300">PEB Training Hall</Link>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-red-500">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/book-auditorium" className="hover:text-red-300">Book Auditorium</Link>
              </li>
              <li>
                <Link to="/booking-history" className="hover:text-red-300">Booking History</Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-red-300">Login</Link>
              </li>
              <li>
                <Link to="/admin-dashboard" className="hover:text-red-300">Admin Dashboard</Link>
              </li>
            </ul>
          </div>

          {/* Help & Support */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-red-500">Help & Support</h3>
            <ul className="space-y-2 text-sm">
              <li>Booking Guidelines</li>
              <li>Terms & Conditions</li>
              <li>Privacy Policy</li>
              <li>Contact Support</li>
            </ul>
            <div className="mt-6">
              <h4 className="font-semibold mb-2">Need Help?</h4>
              <p className="text-sm">For booking assistance:</p>
              <p className="text-sm text-red-400">support@vnrvjiet.ac.in</p>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-10 pt-4 border-t border-gray-700 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} VNR VJIET - Auditorium Management System. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
