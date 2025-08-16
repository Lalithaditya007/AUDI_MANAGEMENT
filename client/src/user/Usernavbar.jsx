import React, { useState } from "react";
import { Link } from "react-router-dom";

const UserNavbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <nav className="bg-red-900 text-white p-4">
      <div className="container mx-auto flex items-center justify-between">
        <h1 className="text-xl font-bold">User Panel</h1>
        {/* Hamburger for mobile */}
        <button
          className="md:hidden flex items-center px-3 py-2 border rounded text-white border-white hover:text-yellow-300"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Toggle navigation menu"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        {/* Desktop menu */}
        <ul className="hidden md:flex space-x-4">
          <li>
            <Link to="/book-auditorium" className="hover:underline">Book Auditorium</Link>
          </li>
          <li>
            <Link to="/booking-history" className="hover:underline">Booking History</Link>
          </li>
          <li>
            <Link to="/user/profile" className="hover:underline">Profile</Link>
          </li>
          <li>
            <Link to="/" className="hover:underline">Logout</Link>
          </li>
        </ul>
      </div>
      {/* Mobile menu dropdown */}
      {menuOpen && (
        <ul className="md:hidden flex flex-col space-y-2 mt-2 bg-red-800 rounded-lg p-4 shadow-lg">
          <li>
            <Link to="/book-auditorium" className="hover:underline" onClick={() => setMenuOpen(false)}>Book Auditorium</Link>
          </li>
          <li>
            <Link to="/booking-history" className="hover:underline" onClick={() => setMenuOpen(false)}>Booking History</Link>
          </li>
          <li>
            <Link to="/user/profile" className="hover:underline" onClick={() => setMenuOpen(false)}>Profile</Link>
          </li>
          <li>
            <Link to="/" className="hover:underline" onClick={() => setMenuOpen(false)}>Logout</Link>
          </li>
        </ul>
      )}
    </nav>
  );
};

export default UserNavbar;