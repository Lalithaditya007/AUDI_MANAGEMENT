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

const upload = multer({ storage });

module.exports = upload;
