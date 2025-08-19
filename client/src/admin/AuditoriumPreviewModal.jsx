import React from 'react';

const AuditoriumPreviewModal = ({ auditorium, onClose }) => {
	if (!auditorium) return null;

	// Debug logging
	console.log('Auditorium data:', auditorium);
	console.log('Auditorium images:', auditorium.images);



	return (
							<div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent backdrop-blur-[6px] p-4">
									<div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] p-6 relative animate-fade-in flex flex-col gap-3 overflow-y-auto border border-gray-300">
												<button onClick={onClose} className="absolute top-3 right-5 text-gray-400 hover:text-red-600 text-3xl font-bold transition-all z-10">&times;</button>
												
												{/* Header Section */}
												<div className="mb-4">
													<h2 className="text-3xl font-extrabold mb-2 text-[#82181A] tracking-tight">{auditorium.name}</h2>
													<div className="text-gray-600 text-base italic leading-relaxed">{auditorium.description}</div>
												</div>
												
												{/* Details Grid */}
												<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
													<div className="space-y-3">
														<div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
															<span className="font-bold text-gray-700 text-base block mb-2">Basic Information</span>
															<div className="space-y-1 text-sm">
																<div><span className="font-semibold text-gray-700">Capacity:</span> <span className="text-gray-900 font-medium">{auditorium.capacity} people</span></div>
																<div><span className="font-semibold text-gray-700">Location:</span> <span className="text-gray-900 font-medium">{auditorium.location}</span></div>
																<div><span className="font-semibold text-gray-700">Size:</span> <span className="text-gray-900 font-medium capitalize">{auditorium.size}</span></div>
															</div>
														</div>
													</div>
													
													<div className="space-y-3">
														<div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
															<span className="font-bold text-gray-700 text-base block mb-2">Contact & Status</span>
															<div className="space-y-1 text-sm">
																<div><span className="font-semibold text-gray-700">Contact Info:</span> <span className="text-gray-900 font-medium">{auditorium.contactInfo}</span></div>
																<div><span className="font-semibold text-gray-700">Status:</span> <span className={`font-medium ${auditorium.available ? 'text-green-600' : 'text-red-600'}`}>{auditorium.available ? 'Available' : 'Not Available'}</span></div>
															</div>
														</div>
													</div>
												</div>
												
												{/* Amenities Section */}
												<div className="mb-4">
													<div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
														<span className="font-bold text-gray-700 text-base block mb-2">Amenities & Features</span>
														<div className="text-gray-900 text-sm leading-relaxed">
															{Array.isArray(auditorium.amenities) ? (
																<div className="flex flex-wrap gap-1.5">
																	{auditorium.amenities.map((amenity, idx) => (
																		<span key={idx} className="bg-[#82181A]/10 text-[#82181A] px-2 py-1 rounded-full text-xs font-medium">
																			{amenity}
																		</span>
																	))}
																</div>
															) : (
																<span>{auditorium.amenities}</span>
															)}
														</div>
													</div>
												</div>
												
												{/* Image Gallery Section */}
												{auditorium.images && auditorium.images.length > 0 && (
													<div className="flex-1">
														<div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
															<span className="font-bold text-gray-700 text-base block mb-3">Image Gallery ({auditorium.images.length} images)</span>
															<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
																{auditorium.images.map((img, idx) => {
																	// Construct the proper image URL
																	let imageUrl;
																	if (img.startsWith('http')) {
																		imageUrl = img;
																	} else {
																		// Use the proxy for local images
																		imageUrl = img;
																	}
																	
																	return (
																		<div key={idx} className="relative group cursor-pointer">
																			<img
																				src={imageUrl}
																				alt={`${auditorium.name} - Image ${idx + 1}`}
																				className="w-full h-32 object-cover rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 group-hover:scale-[1.02]"
																				onError={(e) => {
																					console.error('Image failed to load:', imageUrl);
																					e.target.style.display = 'none';
																				}}
																				onLoad={() => {
																					console.log('Image loaded successfully:', imageUrl);
																				}}
																			/>
																			<div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-all duration-200" />
																			<div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
																				{idx + 1}
																			</div>
																		</div>
																	);
																})}
															</div>
														</div>
													</div>
												)}
			</div>
		</div>
	);
};

export default AuditoriumPreviewModal;
