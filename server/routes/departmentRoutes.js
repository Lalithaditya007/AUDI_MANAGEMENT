// server/routes/departmentRoutes.js
const express = require('express');
const {
    getAllDepartments,
    createDepartment,
    getDepartmentById,
    updateDepartment,
    deleteDepartment
} = require('../controllers/departmentController'); // Import controller functions
const { protect, admin } = require('../middleware/authMiddleware'); // Import auth middleware

const router = express.Router();


router.route('/')
    .get(getAllDepartments) // Changed: Make getting departments public by default for forms
    .post(protect, admin, createDepartment); // Requires user to be logged in AND be an admin


router.route('/:id')
    .get(protect, admin, getDepartmentById)    // Requires admin
    .put(protect, admin, updateDepartment)     // Requires admin
    .delete(protect, admin, deleteDepartment); // Requires admin


module.exports = router; // Export the router to be used in the main server file