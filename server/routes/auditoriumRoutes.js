const express = require('express');
const upload = require('../multerConfig');
const {
    createAuditorium,
    getAllAuditoriums,
    getAuditoriumById,
    updateAuditorium,
    deleteAuditorium,
    getAvailableAuditoriums
} = require('../controllers/auditoriumController'); 
const { protect, admin } = require('../middleware/authMiddleware'); 

const router = express.Router();

// Middleware to set uploadType for auditorium images
function setAuditoriumUploadType(req, res, next) {
    req.uploadType = 'auditorium';
    next();
}

router.route('/')
    .post(protect, admin, setAuditoriumUploadType, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'images', maxCount: 5 }]), createAuditorium)
    .get(getAllAuditoriums);

// Route for getting available auditoriums based on time slot
router.route('/available')
    .get(protect, getAvailableAuditoriums);

router.route('/:id')
    .get(getAuditoriumById)
    .put(protect, admin, setAuditoriumUploadType, upload.fields([{ name: 'image', maxCount: 1 }, { name: 'images', maxCount: 5 }]), updateAuditorium)
    .delete(protect, admin, deleteAuditorium);
module.exports = router;