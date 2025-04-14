// server/controllers/auditoriumController.js
const mongoose = require('mongoose'); // Needed for ObjectId validation
const Auditorium = require('../models/Auditorium'); // Import the Auditorium model
const Booking = require('../models/Booking'); // Assuming you have a Booking model
const { DateTime } = require('luxon'); // Assuming you use Luxon for date handling

// Define IST timezone if used in getAuditoriumSchedule
const istTimezone = 'Asia/Kolkata';

exports.createAuditorium = async (req, res, next) => {
  const { name, capacity, location, description, amenities, imageUrl } = req.body;

  if (!name || !capacity || !location) {
    return res.status(400).json({
      success: false,
      message: 'Please provide auditorium name, capacity, and location',
    });
  }

  try {
    const existingAuditorium = await Auditorium.findOne({ name: name });
    if (existingAuditorium) {
      return res.status(400).json({
        success: false,
        message: `An auditorium with the name "${name}" already exists.`,
      });
    }

    const auditorium = await Auditorium.create({
      name,
      capacity,
      location,
      description, // optional
      amenities,   // optional
      imageUrl,    // optional
    });

    res.status(201).json({
      success: true,
      data: auditorium,
    });

  } catch (error) {
    console.error("Error creating auditorium:", error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    if (error.code === 11000) {
      // More specific message if possible (e.g., based on error details)
      return res.status(400).json({ success: false, message: `Duplicate field value entered. An auditorium with name '${name}' might already exist.` });
    }

    res.status(500).json({ success: false, message: 'Server error while creating auditorium.' });
    // next(error); // Optionally pass to a centralized error handler
  }
};

exports.getAllAuditoriums = async (req, res, next) => {
  try {
    const auditoriums = await Auditorium.find().sort({ name: 1 }); // Sort alphabetically by name

    res.status(200).json({
      success: true,
      count: auditoriums.length, // Include the count
      data: auditoriums,         // The array of auditorium documents
    });

  } catch (error) {
    console.error("Error getting all auditoriums:", error);
    res.status(500).json({ success: false, message: 'Server error while retrieving auditoriums.' });
    // next(error);
  }
};

exports.getAuditoriumById = async (req, res, next) => {
  const auditoriumId = req.params.id;

  // Validate ID format early
  if (!mongoose.Types.ObjectId.isValid(auditoriumId)) {
    return res.status(400).json({ success: false, message: `Invalid ID format: ${auditoriumId}` });
  }

  try {
    const auditorium = await Auditorium.findById(auditoriumId);

    if (!auditorium) {
      return res.status(404).json({ success: false, message: `Auditorium not found with ID: ${auditoriumId}` }); // 404 Not Found
    }

    res.status(200).json({
      success: true,
      data: auditorium, // The single auditorium document
    });

  } catch (error) {
    console.error(`Error getting auditorium by ID ${auditoriumId}:`, error);

    // Specific error handling (CastError is less likely now due to upfront validation, but good practice)
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: `Invalid ID format encountered during query: ${auditoriumId}` });
    }

    res.status(500).json({ success: false, message: 'Server error while retrieving auditorium.' });
    // next(error);
  }
};

exports.updateAuditorium = async (req, res, next) => {
  const auditoriumId = req.params.id;
  const updateData = req.body;

  // Validate ID format
  if (!mongoose.Types.ObjectId.isValid(auditoriumId)) {
    return res.status(400).json({ success: false, message: `Invalid ID format: ${auditoriumId}` });
  }

  // Prevent updating essential fields to empty/null if they are required
  if (updateData.name === '' || updateData.capacity === null || updateData.location === '') {
     return res.status(400).json({ success: false, message: 'Name, capacity, and location cannot be empty.' });
  }

  try {
    // Prevent updating the name to one that already exists (excluding the current document itself)
    if (updateData.name) {
      const existingAuditorium = await Auditorium.findOne({
        name: updateData.name,
        _id: { $ne: auditoriumId } // $ne means "not equal"
      });
      if (existingAuditorium) {
        return res.status(400).json({
          success: false,
          message: `Another auditorium with the name "${updateData.name}" already exists.`,
        });
      }
    }

    const updatedAuditorium = await Auditorium.findByIdAndUpdate(
      auditoriumId,
      updateData, // The fields to update
      { new: true, runValidators: true } // Options: return the updated doc, run schema validators
    );

    if (!updatedAuditorium) {
      return res.status(404).json({ success: false, message: `Auditorium not found with ID: ${auditoriumId}` });
    }

    res.status(200).json({
      success: true,
      data: updatedAuditorium,
    });

  } catch (error) {
    console.error(`Error updating auditorium ID ${auditoriumId}:`, error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    if (error.code === 11000) {
       // More specific duplicate key error message
      return res.status(400).json({ success: false, message: `Update failed: An auditorium with the name '${updateData.name}' may already exist.` });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: `Invalid ID format during update: ${auditoriumId}` });
    }

    res.status(500).json({ success: false, message: 'Server error while updating auditorium.' });
    // next(error);
  }
};

exports.deleteAuditorium = async (req, res, next) => {
  const auditoriumId = req.params.id;

  // Validate ID format
  if (!mongoose.Types.ObjectId.isValid(auditoriumId)) {
    return res.status(400).json({ success: false, message: `Invalid ID format: ${auditoriumId}` });
  }

  try {
    // Optional: Check for associated bookings before deleting
    // const relatedBookings = await Booking.countDocuments({ auditorium: auditoriumId });
    // if (relatedBookings > 0) {
    //   return res.status(400).json({
    //     success: false,
    //     message: `Cannot delete auditorium: It has ${relatedBookings} associated bookings. Please resolve them first.`
    //   });
    // }

    const deletedAuditorium = await Auditorium.findByIdAndDelete(auditoriumId);

    // If no auditorium was found with that ID to delete
    if (!deletedAuditorium) {
      return res.status(404).json({ success: false, message: `Auditorium not found with ID: ${auditoriumId}` });
    }

    res.status(200).json({
      success: true,
      message: `Auditorium '${deletedAuditorium.name}' deleted successfully.`,
      // Optionally return the deleted object ID or limited data
      // data: { _id: deletedAuditorium._id }
    });

  } catch (error) {
    console.error(`Error deleting auditorium ID ${auditoriumId}:`, error);

    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: `Invalid ID format during deletion: ${auditoriumId}` });
    }

    res.status(500).json({ success: false, message: 'Server error while deleting auditorium.' });
    // next(error);
  }
};

// --- Moved from inside deleteAuditorium ---
exports.getAuditoriumSchedule = async (req, res, next) => {
  const auditoriumId = req.params.id;
  const dateParam = req.query.date; // Expecting YYYY-MM-DD

  // Validate Auditorium ID
  if (!mongoose.Types.ObjectId.isValid(auditoriumId)) {
    return res.status(400).json({ success: false, message: `Invalid auditorium ID format: ${auditoriumId}` });
  }

  // Validate Date Parameter
  if (!dateParam) {
    return res.status(400).json({ success: false, message: `Date query parameter is required (YYYY-MM-DD).` });
  }

  // Parse date using Luxon, assuming input is date in IST timezone
  const targetDate = DateTime.fromISO(dateParam, { zone: istTimezone });
  if (!targetDate.isValid) {
    return res.status(400).json({ success: false, message: `Invalid date format: ${dateParam}. Use YYYY-MM-DD.` });
  }

  // Calculate start and end of the target day in IST -> UTC for querying
  const startOfDayIST = targetDate.startOf('day');
  const endOfDayIST = targetDate.endOf('day');
  // Convert to JS Date objects for Mongoose query
  const startOfDayUTC = startOfDayIST.toUTC().toJSDate();
  const endOfDayUTC = endOfDayIST.toUTC().toJSDate();

  try {
    // Optional: Check if auditorium exists first to give a specific 404
    const auditoriumExists = await Auditorium.findById(auditoriumId).select('_id'); // Efficiently check existence
    if (!auditoriumExists) {
      return res.status(404).json({ success: false, message: `Auditorium not found with ID: ${auditoriumId}` });
    }

    // Find *approved* bookings for the given auditorium that overlap the target date
    const schedule = await Booking.find({
      auditorium: auditoriumId,
      status: 'approved', // Only show approved bookings in the schedule
      // Overlap condition: A booking overlaps the day if:
      // (Booking Start < End of Target Day) AND (Booking End > Start of Target Day)
      startTime: { $lt: endOfDayUTC },
      endTime: { $gt: startOfDayUTC },
    })
    .populate('user', 'username email') // Include user info for context (adjust fields as needed)
    .select('eventName startTime endTime user description') // Select relevant fields for the schedule
    .sort({ startTime: 1 }); // Sort by start time

    res.status(200).json({
      success: true,
      date: targetDate.toISODate(), // Confirm the date processed (YYYY-MM-DD)
      schedule: schedule
    });

  } catch (error) {
    console.error(`Error fetching schedule for auditorium ${auditoriumId} on date ${dateParam}:`, error);
    res.status(500).json({ success: false, message: 'Server error retrieving auditorium schedule.' });
    // next(error);
  }
};