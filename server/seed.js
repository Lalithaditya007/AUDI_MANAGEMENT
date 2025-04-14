// server/seedBookings.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const { DateTime } = require('luxon'); // Using Luxon for easier date math

// --- ADDED Global Constant ---
const istTimezone = 'Asia/Kolkata'; // Define timezone for date generation
// --------------------------

// --- Load Environment Variables ---
dotenv.config({ path: path.resolve(__dirname, '.env') });

// --- Import Mongoose Models ---
// Adjust paths if your models are located elsewhere
const Booking = require('./models/Booking');
const User = require('./models/User');
const Auditorium = require('./models/Auditorium');
const Department = require('./models/Department');

// --- Configuration ---
const CLEAR_EXISTING_BOOKINGS = true; // <<< WARNING! Set to false to keep existing bookings >>>
const PAST_BOOKING_COUNT = 40;
const FUTURE_BOOKING_COUNT = 50;
const DAYS_IN_PAST = 30; // How many days back to scatter past bookings
const DAYS_IN_FUTURE = 30; // How many days forward to scatter future bookings
const WORK_START_HOUR = 9; // 9 AM
const WORK_END_HOUR = 17; // 5 PM (events end by this hour)

// --- Globals to hold fetched IDs ---
let ADMIN_USER_ID;
let USER_IDS = []; // Array to hold regular user IDs
let AUDITORIUM_IDS = []; // Array to hold { _id, name } for auditoriums
let DEPARTMENT_IDS = []; // Array to hold { _id, name } for departments

// --- Database Connection ---
const connectDB = async () => {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) { console.error('FATAL: MONGODB_URI not defined.'); process.exit(1); }
    try { await mongoose.connect(MONGODB_URI); console.log('MongoDB connected for seeding bookings...'); }
    catch (err) { console.error('MongoDB connection error:', err.message); process.exit(1); }
};

// --- Functions to fetch prerequisite IDs ---
const fetchPrerequisites = async () => {
    console.log("\nFetching prerequisite data...");
    try {
        // Admin User
        const adminUser = await User.findOne({ role: 'admin' });
        if (!adminUser) throw new Error("❌ Cannot find admin user.");
        ADMIN_USER_ID = adminUser._id;
        console.log(`  ✓ Found Admin: ${adminUser.username}`);

        // Regular Users
        const regularUsers = await User.find({ role: 'user' }).limit(5); // Fetch up to 5 regular users
        if (regularUsers.length === 0) throw new Error("❌ Cannot find any regular users.");
        USER_IDS = regularUsers.map(u => u._id);
        console.log(`  ✓ Found ${regularUsers.length} Regular Users`);

        // Auditoriums
        const auditoriums = await Auditorium.find({}, '_id name');
        if (auditoriums.length === 0) throw new Error("❌ Cannot find any auditoriums.");
        AUDITORIUM_IDS = auditoriums.map(a => ({ _id: a._id, name: a.name }));
        console.log(`  ✓ Found ${auditoriums.length} Auditoriums`);

        // Departments
        const departments = await Department.find({}, '_id name code');
        if (departments.length === 0) throw new Error("❌ Cannot find any departments.");
        DEPARTMENT_IDS = departments.map(d => ({ _id: d._id, name: d.name, code: d.code }));
        console.log(`  ✓ Found ${departments.length} Departments`);

        console.log("Prerequisites fetched successfully.\n");
        return true; // Indicate success
    } catch (error) {
        console.error("--- FATAL ERROR DURING PREREQUISITE FETCH ---");
        console.error(error.message);
        console.error("Please ensure users (admin+regular), auditoriums, and departments exist in the database before running this script.");
        return false; // Indicate failure
    }
};


// --- Helper Functions for Random Data ---
const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// --- Sample Event Details ---
const eventTitles = ["Workshop", "Seminar", "Guest Lecture", "Meeting", "Training", "Presentation", "Hackathon Prep", "Club Event", "Project Demo", "Department Review", "Coding Contest", "Cultural Fest Prep"];
const eventFocus = ["AI/ML", "Cloud", "ECE Dept", "CSE Dept", "Placement", "Student Affairs", "Blockchain", "Web Dev", "Academics", "Robotics", "Data Science", "IoT"];
const sampleDescriptions = [ "Detailed discussion.", "Hands-on session.", "Project review.", "Planning session.", "Tech introduction.", "Mandatory session.", "Open Q&A forum.", "Final rehearsal." ];

// --- Define Function to Generate Sample Booking Data ---
const generateBookings = () => {
    if (!ADMIN_USER_ID || USER_IDS.length === 0 || AUDITORIUM_IDS.length === 0 || DEPARTMENT_IDS.length === 0) {
        throw new Error("Cannot generate bookings - prerequisite data missing.");
    }

    const bookings = [];
    const now = DateTime.now().setZone(istTimezone); // Use IST zone for calculations

    console.log("Generating past booking data...");
    // Generate PAST Bookings
    for (let i = 0; i < PAST_BOOKING_COUNT; i++) {
        const daysAgo = getRandomInt(1, DAYS_IN_PAST);
        const startHour = getRandomInt(WORK_START_HOUR, WORK_END_HOUR - 2);
        const durationHours = getRandomInt(1, 3);

        const eventStartTime = now.minus({ days: daysAgo }).set({ hour: startHour, minute: getRandomElement([0, 15, 30, 45]), second: 0, millisecond: 0 });
        const eventEndTime = eventStartTime.plus({ hours: durationHours });

        const randStatus = Math.random();
        let status = 'approved'; let rejectionReason = undefined;
        if (randStatus < 0.15) { status = 'rejected'; rejectionReason = getRandomElement(["Time conflict.", "Late submission.", "Incomplete details.", "Purpose unclear."]); }
        else if (randStatus < 0.20) { status = 'pending'; }

        const randomUser = (status === 'rejected' || i % 4 === 0) ? getRandomElement(USER_IDS) : ADMIN_USER_ID;
        const randomDept = getRandomElement(DEPARTMENT_IDS);
        const randomAudi = getRandomElement(AUDITORIUM_IDS);
        const eventName = `${getRandomElement(eventTitles)} on ${getRandomElement(eventFocus)} (${randomDept.code || randomDept.name.substring(0,5)})`;

        bookings.push({
            eventName: eventName, description: getRandomElement(sampleDescriptions), startTime: eventStartTime.toJSDate(), endTime: eventEndTime.toJSDate(),
            user: randomUser, auditorium: randomAudi._id, department: randomDept._id, status: status, rejectionReason: rejectionReason,
            createdAt: eventStartTime.minus({ hours: getRandomInt(1, 48) }).toJSDate()
        });
    }
    console.log(`Generated ${bookings.length} past bookings.`);
    const currentPastCount = bookings.length; // Track count before adding future ones

    console.log("\nGenerating future booking data...");
    // Generate FUTURE Bookings
    for (let i = 0; i < FUTURE_BOOKING_COUNT; i++) {
        const daysAhead = getRandomInt(1, DAYS_IN_FUTURE);
        const startHour = getRandomInt(WORK_START_HOUR, WORK_END_HOUR - 2);
        const durationHours = getRandomInt(1, 4);

        const eventStartTime = now.plus({ days: daysAhead }).set({ hour: startHour, minute: getRandomElement([0, 30]), second: 0, millisecond: 0 });
        const eventEndTime = eventStartTime.plus({ hours: durationHours });

        let status = 'approved'; let rejectionReason = undefined;
        if (daysAhead <= 5 && Math.random() < 0.4) { status = 'pending'; }
        else if (Math.random() < 0.15) { status = 'pending'; }
        else if (Math.random() < 0.02) { status = 'rejected'; rejectionReason = "Known schedule conflict."; }

        const randomUser = (i % 3 === 0) ? getRandomElement(USER_IDS) : ADMIN_USER_ID;
        const randomDept = getRandomElement(DEPARTMENT_IDS);
        const randomAudi = getRandomElement(AUDITORIUM_IDS);
        const eventName = `${getRandomElement(eventTitles)} (${randomDept.code || randomDept.name.substring(0,5)}) - ${eventFocus[i % eventFocus.length]}`;

        bookings.push({
            eventName: eventName, description: getRandomElement(sampleDescriptions), startTime: eventStartTime.toJSDate(), endTime: eventEndTime.toJSDate(),
            user: randomUser, auditorium: randomAudi._id, department: randomDept._id, status: status, rejectionReason: status === 'rejected' ? rejectionReason : undefined,
            createdAt: now.minus({ days: getRandomInt(0, daysAhead > 1 ? daysAhead - 1 : 0), hours: getRandomInt(1,12) }).toJSDate()
        });
    }
    console.log(`Generated ${bookings.length - currentPastCount} future bookings.`);
    console.log(`Total bookings generated: ${bookings.length}`);

    return bookings;
};


// --- Main Seeding Function ---
const seedData = async () => {
    try {
        await connectDB();

        // Fetch prerequisite IDs FIRST
        const prerequisitesMet = await fetchPrerequisites();
        if (!prerequisitesMet) {
            console.error("Cannot proceed with seeding due to missing prerequisites.");
            await mongoose.connection.close();
            process.exit(1);
        }

        if (CLEAR_EXISTING_BOOKINGS) {
            console.warn("\nWARNING: Deleting ALL existing bookings...");
            const { deletedCount } = await Booking.deleteMany({});
            console.log(`  ✓ ${deletedCount} existing bookings deleted.`);
        } else {
            console.log("\nSkipping deletion of existing bookings.");
        }

        const bookingsToCreate = generateBookings(); // Generate data *after* IDs are fetched

        console.log(`\nAttempting to insert ${bookingsToCreate.length} sample bookings...`);

        if (bookingsToCreate.length > 0) {
             const insertedBookings = await Booking.insertMany(bookingsToCreate, { ordered: false });
            console.log(`  ✓ ${insertedBookings.length} sample bookings inserted successfully!`);
         } else {
            console.log("No bookings generated to insert.");
        }


    } catch (error) {
        console.error('\n--- ERROR DURING BOOKING SEEDING ---');
        console.error(error.message || error);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('MongoDB connection closed.');
        process.exit(0);
    }
};

// --- Run the Seeder ---
seedData();