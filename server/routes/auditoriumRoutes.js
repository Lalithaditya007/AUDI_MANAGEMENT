const express = require('express');
const multer = require('multer');
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WEBP allowed.'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1,
    },
});
const {
    createAuditorium,
    getAllAuditoriums,
    getAuditoriumById,
    updateAuditorium,
    deleteAuditorium
} = require('../controllers/auditoriumController'); 
const { protect, admin } = require('../middleware/authMiddleware'); 

const router = express.Router();

router.route('/')
    .post(protect, admin, upload.single('image'), createAuditorium) 
    .get(getAllAuditoriums);

router.route('/:id')
    .get(getAuditoriumById)
    .put(protect, admin, updateAuditorium) 
    .delete(protect, admin, deleteAuditorium); 
module.exports = router;