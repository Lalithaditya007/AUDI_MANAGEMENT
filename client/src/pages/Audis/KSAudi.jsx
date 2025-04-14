import React from "react";
import ksaudi from "../../assets/ksaudi.jpg";




const KSAuditorium = () => {
  return (
    <div className="p-8">
      <div className="w-full flex justify-center">
        <img
          src={ksaudi} // Path to the image in the 'public/assets' folder
          alt="KS Auditorium"
          className="w-[80%] h-[500px] object-cover rounded-xl shadow-lg"
        />
      </div>
      
      <h1 className="text-3xl font-bold mt-6 mb-4">KS Auditorium</h1>
      
      <p className="text-lg mb-6">
        The KS Auditorium is a large, state-of-the-art facility equipped with advanced sound and 
        lighting systems. It is suitable for hosting major events, seminars, and cultural programs. 
        The auditorium has a seating capacity of 500 and provides a professional environment for various activities.
      </p>

      <ul className="list-disc pl-6 space-y-2">
        <li>Seating Capacity: 500</li>
        <li>Advanced Sound and Lighting Systems</li>
        <li>Air-conditioned Environment</li>
        <li>Stage with Modern Equipment</li>
      </ul>
    </div>
  );
};

export default KSAuditorium;
