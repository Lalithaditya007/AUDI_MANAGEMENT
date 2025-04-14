import React from "react";
import PEB from "../../assets/PEB.jpg"; // Import the image from the assets folder

const PEBHall = () => {
  return (
    <div className="p-8">
      <div className="w-full flex justify-center">
        <img
          src={PEB} // Path to the image in the 'public/assets' folder
          alt="PEB Training Hall"
          className="w-[80%] h-[500px] object-cover rounded-xl shadow-lg"
        />
      </div>

      <h1 className="text-3xl font-bold mt-6 mb-4">PEB Training Hall</h1>

      <p className="text-lg mb-6">
        The PEB Training Hall is a versatile space designed for training sessions, workshops, and
        small-scale events. It is equipped with modern facilities to ensure a productive and
        comfortable environment for participants.
      </p>

      <ul className="list-disc pl-6 space-y-2">
        <li>Seating Capacity: 150</li>
        <li>Modern Training Equipment</li>
        <li>Fully Air-Conditioned</li>
        <li>Flexible Seating Arrangements</li>
      </ul>
    </div>
  );
};

export default PEBHall;