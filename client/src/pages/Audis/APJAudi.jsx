import React from "react";

const APJAuditorium = () => {
  return (
    <div className="p-8">
      <div className="w-full flex justify-center">
        <img
          src="/assets/apj-auditorium.jpg" // Path to the image in the 'public/assets' folder
          alt="APJ Abdul Kalam Auditorium"
          className="w-[80%] h-[500px] object-cover rounded-xl shadow-lg"
        />
      </div>

      <h1 className="text-3xl font-bold mt-6 mb-4">APJ Abdul Kalam Auditorium</h1>

      <p className="text-lg mb-6">
        The APJ Abdul Kalam Auditorium is a modern facility designed to host a variety of events,
        including conferences, seminars, and cultural programs. It is equipped with advanced
        audio-visual systems and provides a comfortable environment for attendees.
      </p>

      <ul className="list-disc pl-6 space-y-2">
        <li>Seating Capacity: 300</li>
        <li>High-Quality Audio-Visual Systems</li>
        <li>Fully Air-Conditioned</li>
        <li>Spacious Stage with Advanced Lighting</li>
      </ul>
    </div>
  );
};

export default APJAuditorium;