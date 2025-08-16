import React from 'react';
import Slider from 'react-slick';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

const AuditoriumPreviewModal = ({ auditorium, onClose }) => {
	if (!auditorium) return null;

	// Carousel settings
		const settings = {
			dots: true,
			infinite: true,
			speed: 350,
			slidesToShow: 1,
			slidesToScroll: 1,
			arrows: true,
			adaptiveHeight: true,
			autoplay: true,
			autoplaySpeed: 1200,
		};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
			<div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative animate-fade-in">
				<button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-red-600 text-2xl font-bold">&times;</button>
				<h2 className="text-2xl font-bold mb-2 text-[#82181A]">{auditorium.name}</h2>
				<div className="mb-4 text-gray-700">{auditorium.description}</div>
				<div className="mb-2"><span className="font-semibold">Capacity:</span> {auditorium.capacity}</div>
				<div className="mb-2"><span className="font-semibold">Location:</span> {auditorium.location}</div>
				<div className="mb-2"><span className="font-semibold">Amenities:</span> {Array.isArray(auditorium.amenities) ? auditorium.amenities.join(', ') : auditorium.amenities}</div>
				<div className="mb-2"><span className="font-semibold">Contact Info:</span> {auditorium.contactInfo}</div>
				<div className="mb-2"><span className="font-semibold">Size:</span> {auditorium.size}</div>
				{auditorium.images && auditorium.images.length > 0 && (
					<div className="mt-4">
						<Slider {...settings}>
							{auditorium.images.map((img, idx) => (
								<div key={idx} className="flex justify-center items-center">
									<img
										src={img.startsWith('http') ? img : `${window.location.origin}${img}`}
										alt={`Auditorium ${idx + 1}`}
										className="w-full h-56 object-cover rounded-xl border shadow"
									/>
								</div>
							))}
						</Slider>
					</div>
				)}
			</div>
		</div>
	);
};

export default AuditoriumPreviewModal;
