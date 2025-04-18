import React from "react";
import { NavLink } from "react-router-dom";

const AdminNavbar = () => {
  return (
    <nav className="bg-red-900 text-white p-4 shadow-md">
      <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center">
        <h1 className="text-lg font-bold">Admin Panel</h1>
        <ul className="flex flex-wrap gap-4 mt-2 sm:mt-0">
          <li>
            <NavLink to="/admin-dashboard" className={({isActive}) => 
              `hover:underline ${isActive ? 'font-bold' : ''}`}>
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/manage-bookings" className={({isActive}) => 
              `hover:underline ${isActive ? 'font-bold' : ''}`}>
              Manage Bookings
            </NavLink>
          </li>
          <li>
            <NavLink to="/" className={({isActive}) => 
              `hover:underline ${isActive ? 'font-bold' : ''}`}>
              Logout
            </NavLink>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default AdminNavbar;
