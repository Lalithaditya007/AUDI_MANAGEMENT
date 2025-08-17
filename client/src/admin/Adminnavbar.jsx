import React from "react";
import { NavLink } from "react-router-dom";

const AdminNavbar = () => {
  return (
    <nav className="backdrop-blur-md bg-white/20 bg-opacity-60 text-white fixed w-full z-50 top-0 left-0 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <img className="h-8 w-8 md:h-10 md:w-10" src="/logo.png" alt="Logo" />
          </div>
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button className="text-white hover:text-blue-300 focus:outline-none bg-white/10 border border-white/30 rounded p-2 backdrop-blur-lg">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          {/* Desktop menu */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-4">
              {/* Navigation items */}
              <NavLink to="/admin-dashboard" className={({isActive}) => 
                `text-white hover:text-blue-200 px-3 py-2 rounded-md text-sm font-medium hover:underline ${isActive ? 'font-bold bg-blue-700/70' : ''}`}>
                Dashboard
              </NavLink>
              <NavLink to="/manage-bookings" className={({isActive}) => 
                `text-white hover:text-blue-200 px-3 py-2 rounded-md text-sm font-medium hover:underline ${isActive ? 'font-bold bg-blue-700/70' : ''}`}>
                Manage Bookings
              </NavLink>
              <NavLink to="/admin/feedback" className={({isActive}) => 
                `text-white hover:text-blue-200 px-3 py-2 rounded-md text-sm font-medium hover:underline ${isActive ? 'font-bold bg-blue-700/70' : ''}`}>
                Feedback
              </NavLink>
              <NavLink to="/admin/reports" className={({isActive}) => 
                `text-white hover:text-blue-200 px-3 py-2 rounded-md text-sm font-medium hover:underline ${isActive ? 'font-bold bg-blue-700/70' : ''}`}>
                Reports
              </NavLink>
              <NavLink to="/admin/create-user" className={({isActive}) => 
                `text-white hover:text-blue-200 px-3 py-2 rounded-md text-sm font-medium hover:underline ${isActive ? 'font-bold bg-blue-700/70' : ''}`}>
                Create User
              </NavLink>
              <NavLink to="/admin/profile" className={({isActive}) => 
                `text-white hover:text-blue-200 px-3 py-2 rounded-md text-sm font-medium hover:underline ${isActive ? 'font-bold bg-blue-700/70' : ''}`}>
                Profile
              </NavLink>
              <NavLink to="/" className={({isActive}) => 
                `text-white hover:text-blue-200 px-3 py-2 rounded-md text-sm font-medium hover:underline ${isActive ? 'font-bold bg-blue-700/70' : ''}`}>
                Logout
              </NavLink>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default AdminNavbar;
