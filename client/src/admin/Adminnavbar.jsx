import React from "react";
import { NavLink } from "react-router-dom";

const AdminNavbar = () => {
  return (
    <nav className="bg-blue-600 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <img className="h-8 w-8 md:h-10 md:w-10" src="/logo.png" alt="Logo" />
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden">
            <button className="text-white hover:text-gray-300 focus:outline-none">
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
                `hover:underline ${isActive ? 'font-bold' : ''}`}>
                Dashboard
              </NavLink>
              <NavLink to="/manage-bookings" className={({isActive}) => 
                `hover:underline ${isActive ? 'font-bold' : ''}`}>
                Manage Bookings
              </NavLink>
              <NavLink to="/admin/create-user" className={({isActive}) => 
                `hover:underline ${isActive ? 'font-bold' : ''}`}>
                Create User
              </NavLink>
              <NavLink to="/admin/profile" className={({isActive}) => 
                `hover:underline ${isActive ? 'font-bold' : ''}`}>
                Profile
              </NavLink>
              <NavLink to="/" className={({isActive}) => 
                `hover:underline ${isActive ? 'font-bold' : ''}`}>
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
