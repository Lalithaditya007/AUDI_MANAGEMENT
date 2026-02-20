import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center bg-gradient-to-br from-red-50 via-white to-red-50">
      <div className="relative mb-10">
        <div className="absolute -inset-4 bg-gradient-to-r from-red-600 to-red-400 opacity-20 blur-2xl rounded-full"></div>
        <h1 className="relative text-8xl md:text-9xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-[#82181A] to-red-400 select-none">404</h1>
      </div>
      <h2 className="text-2xl md:text-3xl font-bold text-[#82181A] mb-4">Page Not Found</h2>
      <p className="text-gray-600 max-w-md mb-8">The page you're looking for doesn't exist or was moved. Check the URL or head back to explore events and auditoriums.</p>
      <div className="flex flex-wrap gap-4 justify-center">
        <Link to="/" className="px-6 py-3 rounded-full bg-[#82181A] text-white font-medium shadow hover:bg-[#9d2224] transition">Go Home</Link>
        <Link to="/events" className="px-6 py-3 rounded-full bg-white text-[#82181A] font-medium border border-[#82181A]/30 hover:border-[#82181A] shadow-sm hover:shadow transition">View Events</Link>
        <Link to="/auditoriums" className="px-6 py-3 rounded-full bg-white text-[#82181A] font-medium border border-[#82181A]/30 hover:border-[#82181A] shadow-sm hover:shadow transition">Auditoriums</Link>
      </div>
      <div className="mt-12 text-xs text-gray-400">Error Code: 404_NOT_FOUND</div>
    </div>
  );
};

export default NotFound;
