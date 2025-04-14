// server/controllers/departmentController.js
const mongoose = require('mongoose');
const Department = require('../models/Department'); // Import the Department model
const Booking = require('../models/Booking'); // Import Booking model for deletion check

/**
 * @desc    Get all departments
 * @route   GET /api/departments
 * @access  Public (Adjust middleware in routes if needed)
 * Fetches all departments, sorted alphabetically by name. Useful for populating dropdowns.
 */
exports.getAllDepartments = async (req, res, next) => {
    try {
        const departments = await Department.find().sort({ name: 1 }); // Sort by name A-Z
        res.status(200).json({
            success: true,
            count: departments.length,
            data: departments,
        });
    } catch (error) {
        console.error("Error getting all departments:", error);
        // Avoid sending detailed internal errors to the client in production
        res.status(500).json({ success: false, message: 'Server error while retrieving departments.' });
        // Optionally call next(error) if you have centralized error handling middleware
    }
};

/**
 * @desc    Create a new department
 * @route   POST /api/departments
 * @access  Private/Admin (Enforced by middleware in routes)
 * Creates a single new department. Checks for existing names (case-insensitive).
 */
exports.createDepartment = async (req, res, next) => {
    // Extract potentially all fields from the model, trim strings
    const { name, code, description } = req.body;
    const trimmedName = name ? name.trim() : undefined;
    const trimmedCode = code ? code.trim().toUpperCase() : undefined; // Ensure uppercase code
    const trimmedDescription = description ? description.trim() : undefined;


    // Basic validation: Name is required
    if (!trimmedName) {
        return res.status(400).json({ success: false, message: 'Please provide a department name' });
    }

    try {
        // Check if department name already exists (case-insensitive regex)
        const existingByName = await Department.findOne({ name: { $regex: `^${trimmedName}$`, $options: 'i' } });
        if (existingByName) {
            return res.status(400).json({ success: false, message: `Department name "${existingByName.name}" already exists.` });
        }

        // Check if department code already exists (if provided)
        if (trimmedCode) {
             const existingByCode = await Department.findOne({ code: trimmedCode }); // Code is stored uppercase
             if (existingByCode) {
                  return res.status(400).json({ success: false, message: `Department code "${existingByCode.code}" already exists.` });
             }
        }

        // Create department data object
        const departmentData = { name: trimmedName };
        if (trimmedCode) departmentData.code = trimmedCode;
        if (trimmedDescription) departmentData.description = trimmedDescription;

        const department = await Department.create(departmentData);

        res.status(201).json({
            success: true,
            message: `Department '${department.name}' created successfully.`,
            data: department,
        });
    } catch (error) {
        console.error("Error creating department:", error);
        // Handle Mongoose validation errors specifically
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join('. ') });
        }
        // Handle potential duplicate key errors (fallback for race conditions not caught by checks above)
        if (error.code === 11000) {
            // Determine which field caused the error (could be name or code)
            const field = Object.keys(error.keyValue)[0];
            return res.status(400).json({ success: false, message: `Duplicate value entered for ${field}.` });
        }
        res.status(500).json({ success: false, message: 'Server error while creating department.' });
    }
};

/**
 * @desc    Get a single department by its ID
 * @route   GET /api/departments/:id
 * @access  Private/Admin (Enforced by middleware in routes, adjust if needed)
 */
exports.getDepartmentById = async (req, res, next) => {
    const departmentId = req.params.id;

    // Validate the ID format
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        return res.status(400).json({ success: false, message: 'Invalid Department ID format' });
    }

    try {
        const department = await Department.findById(departmentId);

        if (!department) {
            // Use 404 Not Found status code
            return res.status(404).json({ success: false, message: 'Department not found with this ID' });
        }

        res.status(200).json({ success: true, data: department });
    } catch (error) {
        console.error(`Error getting department by ID ${departmentId}:`, error);
        if (error.name === 'CastError') { // Double check CastError in case validation above fails? Usually redundant.
             return res.status(400).json({ success: false, message: `Invalid ID format: ${departmentId}` });
        }
        res.status(500).json({ success: false, message: 'Server error retrieving department.' });
    }
};

/**
 * @desc    Update an existing department by ID
 * @route   PUT /api/departments/:id
 * @access  Private/Admin (Enforced by middleware in routes)
 * Updates name, code, or description. Performs uniqueness checks.
 */
exports.updateDepartment = async (req, res, next) => {
    const departmentId = req.params.id;
    const { name, code, description } = req.body; // Get fields to update

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        return res.status(400).json({ success: false, message: 'Invalid Department ID format' });
    }

    // Prepare update object, only including fields that are actually present in the request body
    const updateData = {};
    let trimmedName, trimmedCode, trimmedDescription;

    if (name !== undefined) {
        trimmedName = name.trim();
        if (!trimmedName) { return res.status(400).json({ success: false, message: 'Department name cannot be empty if provided' }); }
        updateData.name = trimmedName;
    }
    if (code !== undefined) { // Allow sending empty string to potentially clear the code
        trimmedCode = code.trim().toUpperCase();
        updateData.code = trimmedCode ? trimmedCode : null; // Store null if empty string sent
    }
    if (description !== undefined) {
         trimmedDescription = description.trim();
         updateData.description = trimmedDescription; // Allow empty string description
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ success: false, message: 'No update data provided' });
    }

    try {
        // Check for name conflict (excluding the document being updated itself)
        if (updateData.name) {
             const existingByName = await Department.findOne({ name: { $regex: `^${updateData.name}$`, $options: 'i' }, _id: { $ne: departmentId } });
             if (existingByName) {
                  return res.status(400).json({ success: false, message: `Another department named "${existingByName.name}" already exists.` });
             }
        }

        // Check for code conflict (excluding self)
        if (updateData.code) { // Only check if a non-empty code is being set
             const existingByCode = await Department.findOne({ code: updateData.code, _id: { $ne: departmentId } });
             if (existingByCode) {
                  return res.status(400).json({ success: false, message: `Another department with code "${existingByCode.code}" already exists.` });
             }
        } else if (updateData.hasOwnProperty('code') && updateData.code === null) {
            // If code is explicitly set to null/empty, no uniqueness check needed
        }

        // Perform the update
        const department = await Department.findByIdAndUpdate(departmentId, updateData, {
            new: true, // Return the updated document
            runValidators: true, // Run schema validators on update
        });

        if (!department) {
            return res.status(404).json({ success: false, message: 'Department not found with this ID' });
        }

        res.status(200).json({
            success: true,
            message: `Department '${department.name}' updated successfully.`,
            data: department
        });
    } catch (error) {
        console.error(`Error updating department ID ${departmentId}:`, error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join('. ') });
        }
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            return res.status(400).json({ success: false, message: `Update failed: Duplicate value entered for ${field}.` });
        }
         if (error.name === 'CastError') { // Less likely here but good practice
             return res.status(400).json({ success: false, message: `Invalid ID format: ${departmentId}` });
        }
        res.status(500).json({ success: false, message: 'Server error while updating department.' });
    }
};


/**
 * @desc    Delete a department by ID
 * @route   DELETE /api/departments/:id
 * @access  Private/Admin (Enforced by middleware in routes)
 * Deletes a department ONLY if no existing bookings reference it.
 */
exports.deleteDepartment = async (req, res, next) => {
    const departmentId = req.params.id;

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        return res.status(400).json({ success: false, message: 'Invalid Department ID format' });
    }

    try {
        // *** IMPORTANT CHECK: Prevent deletion if bookings exist referencing this department ***
        // This prevents orphaned records in the Booking collection.
        const relatedBookingCount = await Booking.countDocuments({ department: departmentId });
        if (relatedBookingCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete department: It is associated with ${relatedBookingCount} booking(s). Please reassign or delete bookings first.`
            });
        }

        // Proceed with deletion if no bookings are associated
        const department = await Department.findByIdAndDelete(departmentId);

        if (!department) {
            return res.status(404).json({ success: false, message: 'Department not found with this ID' });
        }

        res.status(200).json({
             success: true,
             message: `Department '${department.name}' deleted successfully.`
             // Optionally return the deleted department object: data: department
        });
    } catch (error) {
        console.error(`Error deleting department ID ${departmentId}:`, error);
        if (error.name === 'CastError') { // Less likely here
             return res.status(400).json({ success: false, message: `Invalid ID format: ${departmentId}` });
        }
        res.status(500).json({ success: false, message: 'Server error while deleting department.' });
    }
};