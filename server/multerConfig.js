const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Helper to ensure directory exists
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Determine folder based on upload type
    let folder = req.uploadType;
    let uploadPath = path.join(__dirname, 'uploads');
    if (folder === 'auditorium') {
      uploadPath = path.join(uploadPath, 'auditorium');
    } else if (folder === 'events') {
      uploadPath = path.join(uploadPath, 'events');
    } else if (folder === 'profiles') {
      uploadPath = path.join(uploadPath, 'profiles');
    } else if (folder === 'feedback') {
      uploadPath = path.join(uploadPath, 'feedback');
    } else if (folder === 'reports') {
      uploadPath = path.join(uploadPath, 'reports');
    } else {
      uploadPath = path.join(uploadPath, 'other');
    }
    ensureDir(uploadPath);
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for different upload types
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    profiles: /jpeg|jpg|png|gif/,
    feedback: /jpeg|jpg|png|gif|pdf|doc|docx|txt/,
    reports: /jpeg|jpg|png|gif|pdf|doc|docx|txt|mp4|avi|mov/,
    auditorium: /jpeg|jpg|png|gif/,
    events: /jpeg|jpg|png|gif|pdf/
  };

  const uploadType = req.uploadType || 'other';
  const allowedMimeTypes = allowedTypes[uploadType] || /jpeg|jpg|png|gif/;
  
  if (allowedMimeTypes.test(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type for ${uploadType}. Only ${allowedMimeTypes} files are allowed.`), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

module.exports = upload;
