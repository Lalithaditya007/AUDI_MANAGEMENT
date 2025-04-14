import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-red-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <div className="space-y-2">
              <p className="flex items-center">
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>+91 40 2304 2758</span>
              </p>
              <p className="flex items-center">
                <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>info@vnrvjiet.ac.in</span>
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/auditoriums" className="hover:text-red-200 transition">
                  Our Auditoriums
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-red-200 transition">
                  Book Now
                </Link>
              </li>
            </ul>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Location</h3>
            <p className="text-sm leading-relaxed">
              VNR Vignana Jyothi Institute of Engineering & Technology,<br />
              Vignana Jyothi Nagar, Pragathi Nagar,<br />
              Nizampet (S.O), Hyderabad - 500 090,<br />
              Telangana, India
            </p>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-4 border-t border-red-800 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} VNR VJIET. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;