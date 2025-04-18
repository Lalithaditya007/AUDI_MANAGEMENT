import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom"; // Added useLocation here just in case needed for state pass-through in future
import Navbar from "./components/Navbar";
import Auditoriums from "./pages/Audis/Auditoriums";
import KSAudi from "./pages/Audis/KSAudi";
import Homepage from "./pages/Homepage";
import Login from "./pages/Login";
import BBlockSeminarHall from "./pages/Audis/BBlock";
import BookAuditorium from "./user/BookAuditorium";
import AdminDashboard from "./admin/Admindashboard";
import ManageBookings from "./admin/ManageBookings";
import BookingHistory from "./user/BookingHistory";
import APJAuditorium from "./pages/Audis/APJAudi.jsx";
import PEBHall from "./pages/Audis/PEBHall.jsx";
import AdminScheduleViewer from "./admin/AdminScheduleViewer"; 
import Footer from "./components/Footer";


function AppContent() {
    // Needed to use useLocation inside App for state passing
    const location = useLocation();

    const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('authToken'));
    const [userRole, setUserRole] = useState(() => localStorage.getItem('userRole') || "");
    const [userEmail, setUserEmail] = useState(() => localStorage.getItem('userEmail') || "");

    useEffect(() => { const handler = () => { setIsLoggedIn(!!localStorage.getItem('authToken')); setUserRole(localStorage.getItem('userRole') || ""); setUserEmail(localStorage.getItem('userEmail') || ""); }; window.addEventListener('storage', handler); return () => { window.removeEventListener('storage', handler); }; }, []);

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar isLoggedIn={isLoggedIn} userRole={userRole} setIsLoggedIn={setIsLoggedIn} setUserRole={setUserRole} setUserEmail={setUserEmail} />
            <main className="flex-grow">
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Homepage />} /> 
                    <Route path="/auditoriums" element={<Auditoriums />} /> 
                    <Route path="/ks-auditorium" element={<KSAudi />} /> 
                    <Route path="/b-block-seminar-hall" element={<BBlockSeminarHall />} />
                    <Route path="/auditoriums/b-block" element={<BBlockSeminarHall />} />
                    <Route path="/peb-hall" element={<PEBHall />} /> 
                    <Route path="/apj-auditorium" element={<APJAuditorium />} />

                    {/* Login Route - Modified */}
                    <Route path="/login" element={
                        isLoggedIn ? (
                            userRole === "admin" ? 
                                <Navigate to="/admin-dashboard"/> : 
                                <Navigate to="/"/>
                        ) : (
                            <Login 
                                setIsLoggedIn={setIsLoggedIn} 
                                setUserRole={setUserRole} 
                                setUserEmail={setUserEmail}
                            />
                        )
                    } />

                    {/* Rest of your routes remain the same */}
                    <Route path="/admin-login" element={<Navigate to="/login" replace />} />
                    
                    {/* User Routes */}
                    <Route path="/book-auditorium" element={isLoggedIn&&userRole==='user'?<BookAuditorium userEmail={userEmail}/>:<Navigate to="/login" replace state={{from:location.pathname}}/>} />
                    <Route path="/booking-history" element={isLoggedIn&&userRole==='user'?<BookingHistory />:<Navigate to="/login" replace state={{from:location.pathname}}/>} />
                    
                    {/* Admin Routes */}
                    <Route path="/admin-dashboard" element={isLoggedIn&&userRole==='admin'?<AdminDashboard />:<Navigate to="/login" replace state={{from:location.pathname}}/>} />
                    <Route path="/manage-bookings" element={isLoggedIn&&userRole==='admin'?<ManageBookings />:<Navigate to="/login" replace state={{from:location.pathname}}/>} />
                    <Route path="/admin/schedule-viewer" element={isLoggedIn&&userRole==='admin'?<AdminScheduleViewer />:<Navigate to="/login" replace state={{from:location.pathname}}/>} />

                    <Route path="*" element={<div className="p-10 text-center"><h2>404 Not Found</h2></div>} />
                </Routes>
            </main>
            <Footer />
        </div>
    );
}

// Wrap AppContent in Router
function App() {
    return (
        <Router>
            <AppContent />
        </Router>
    );
}
export default App;