const express = require('express');
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
    .post(protect, admin, createAuditorium) 
    .get(getAllAuditoriums);

router.route('/:id')
    .get(getAuditoriumById)
    .put(protect, admin, updateAuditorium) 
    .delete(protect, admin, deleteAuditorium); 
module.exports = router;