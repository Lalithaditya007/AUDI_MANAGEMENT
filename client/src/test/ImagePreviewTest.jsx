import React, { useState } from 'react';

const ImagePreviewTest = () => {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        alert("Please select a valid image file (JPEG, PNG, or GIF)");
        e.target.value = '';
        return;
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert("File size must be less than 5MB");
        e.target.value = '';
        return;
      }
      
      console.log("File selected:", file.name, file.type, file.size);
    }
    
    setSelectedFile(file || null);
  };

  const removeFile = () => {
    if (selectedFile) {
      const imgElement = document.querySelector('#test-preview');
      if (imgElement && imgElement.src) {
        URL.revokeObjectURL(imgElement.src);
      }
    }
    setSelectedFile(null);
    const fileInput = document.querySelector('#test-file-input');
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className="p-8 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Image Preview Test</h2>
      
      {!selectedFile ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <input
            id="test-file-input"
            type="file"
            accept="image/png, image/jpeg, image/gif"
            onChange={handleFileChange}
            className="mb-2"
          />
          <p className="text-sm text-gray-500">Select an image to preview</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <img
              id="test-preview"
              src={URL.createObjectURL(selectedFile)}
              alt="Preview"
              className="w-full h-48 object-cover rounded-lg border"
              onLoad={() => console.log("Image loaded successfully")}
              onError={(e) => {
                console.error("Error loading image:", e);
                alert("Error loading image preview");
              }}
            />
            <button
              onClick={removeFile}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
            >
              ×
            </button>
          </div>
          <div className="text-sm text-gray-600">
            <p><strong>Name:</strong> {selectedFile.name}</p>
            <p><strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            <p><strong>Type:</strong> {selectedFile.type}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImagePreviewTest;
