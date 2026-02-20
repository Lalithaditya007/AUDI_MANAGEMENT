import React from 'react';

const AuditoriumPreviewModal = ({ auditorium, onClose }) => {
	if (!auditorium) return null;



	return (
							<div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent backdrop-blur-[6px]">
									<div className="backdrop-blur-md bg-white/60 rounded-2xl shadow-2xl max-w-xl w-full p-6 relative animate-fade-in flex flex-col gap-2 max-h-[90vh] overflow-y-auto border border-gray-300">
												<button onClick={onClose} className="absolute top-3 right-4 text-gray-400 hover:text-red-600 text-3xl font-bold transition-all">&times;</button>
												<h2 className="text-3xl font-extrabold mb-1 text-[#82181A] tracking-tight">{auditorium.name}</h2>
												<div className="mb-2 text-gray-600 text-base italic">{auditorium.description}</div>
												<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 mb-2 text-[1rem]">
													<div><span className="font-semibold text-gray-700">Capacity:</span> <span className="text-gray-900">{auditorium.capacity}</span></div>
													<div><span className="font-semibold text-gray-700">Location:</span> <span className="text-gray-900">{auditorium.location}</span></div>
													<div className="sm:col-span-2"><span className="font-semibold text-gray-700">Amenities:</span> <span className="text-gray-900">{Array.isArray(auditorium.amenities) ? auditorium.amenities.join(', ') : auditorium.amenities}</span></div>
													<div><span className="font-semibold text-gray-700">Contact Info:</span> <span className="text-gray-900">{auditorium.contactInfo}</span></div>
													<div><span className="font-semibold text-gray-700">Size:</span> <span className="text-gray-900">{auditorium.size}</span></div>
												</div>
												{auditorium.images && auditorium.images.length > 0 && (
													<div className="mt-2 rounded-xl border border-gray-200 bg-white p-2">
														<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
															{auditorium.images.map((img, idx) => (
																<div key={idx} className="relative group">
																	<img
																		src={img.startsWith('http') ? img : `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${img}`}
																		alt={`Auditorium ${idx + 1}`}
																		className="w-full h-40 object-cover rounded-lg border border-gray-200"
																	/>
																</div>
															))}
														</div>
													</div>
												)}
			</div>
		</div>
	);
};

export default AuditoriumPreviewModal;
