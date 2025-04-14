import React from "react";
import { Link } from "react-router-dom";

const AdminNavbar = () => {
  return (
    <nav className="bg-red-900 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-xl font-bold">Admin Panel</h1>
        <ul className="flex space-x-4">
          <li>
            <Link to="/admin-dashboard" className="hover:underline">
              Dashboard
            </Link>
          </li>
          <li>
            <Link to="/manage-bookings" className="hover:underline">
              Manage Bookings
            </Link>
          </li>
          <li>
            <Link to="/" className="hover:underline">
              Logout
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default AdminNavbar;