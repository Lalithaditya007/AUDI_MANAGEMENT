// server/models/Department.js
const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a department name'],
        unique: true, // << Ensures uniqueness AND implicitly creates an index on 'name'
        trim: true,
        maxlength: [100, 'Department name cannot exceed 100 characters']
    },
    code: {
        type: String,
        unique: true, // << Ensures uniqueness for non-null values AND implicitly creates an index
        sparse: true, // Important: Allows multiple documents to omit this field (value is null/absent) without violating the unique constraint.
        trim: true,
        uppercase: true, // Store codes consistently in uppercase
        maxlength: [15, 'Department code cannot exceed 15 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
}, {
    timestamps: true
});


DepartmentSchema.index({ name: 1 });

DepartmentSchema.index({ code: 1 });




module.exports = mongoose.model('Department', DepartmentSchema);