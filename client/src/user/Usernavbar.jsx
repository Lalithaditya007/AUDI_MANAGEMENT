import React from "react";
import { Link } from "react-router-dom";

const UserNavbar = () => {
  return (
    <nav className="bg-red-900 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-xl font-bold">User Panel</h1>
        <ul className="flex space-x-4">
          <li>
            <Link to="/book-auditorium" className="hover:underline">
              Book Auditorium
            </Link>
          </li>
          <li>
            <Link to="/booking-history" className="hover:underline">
              Booking History
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

export default UserNavbar;