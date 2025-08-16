const express = require('express');
const upload = require('../multerConfig');
const {
    createAuditorium,
    getAllAuditoriums,
    getAuditoriumById,
    updateAuditorium,
    deleteAuditorium
} = require('../controllers/auditoriumController'); 
const { protect, admin } = require('../middleware/authMiddleware'); 

const router = express.Router();

// Middleware to set uploadType for auditorium images
function setAuditoriumUploadType(req, res, next) {
    req.uploadType = 'auditorium';
    next();
}

router.route('/')
        .post(protect, admin, setAuditoriumUploadType, upload.single('image'), createAuditorium)
        .get(getAllAuditoriums);

router.route('/:id')
    .get(getAuditoriumById)
    .put(protect, admin, setAuditoriumUploadType, upload.single('image'), updateAuditorium)
    .delete(protect, admin, deleteAuditorium);
module.exports = router;