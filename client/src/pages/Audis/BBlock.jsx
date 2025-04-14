import React from "react";
import bblock from "../../assets/bblock.jpg";

const BBlockSeminarHall = () => {
  return (
    <div className="p-8">
      <div className="w-full flex justify-center">
        <img
          src={bblock} // Path to the image in the 'public/assets' folder
          alt="B Block Seminar Hall"
          className="w-full max-w-4xl h-auto object-contain rounded-xl shadow-lg"
        />
      </div>

      <h1 className="text-3xl font-bold mt-6 mb-4">B Block Seminar Hall</h1>

      <p className="text-lg mb-6">
        The B Block Seminar Hall is a spacious and well-equipped venue designed for academic talks, presentations, and workshops. It provides a professional environment for students and faculty to engage in knowledge-sharing activities.
      </p>

      <ul className="list-disc pl-6 space-y-2">
        <li>Seating Capacity: 300</li>
        <li>Modern Audio-Visual Equipment</li>
        <li>Air-conditioned Environment</li>
        <li>Flexible Seating Arrangements</li>
      </ul>
    </div>
  );
};

export default BBlockSeminarHall;