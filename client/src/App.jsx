import EditAuditorium from "./admin/EditAuditorium";
import ManageAuditoriums from "./admin/ManageAuditoriums";
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Auditoriums from "./pages/Audis/Auditoriums";
import KSAudi from "./pages/Audis/KSAudi";
import Homepage from "./pages/Homepage";
import Login from "./pages/Login";
import BBlockSeminarHall from "./pages/Audis/BBlock";
import BookAuditorium from "./user/BookAuditorium";
import AdminDashboard from "./admin/AdminDashboard";
import ManageBookings from "./admin/ManageBookings";
import CreateUser from "./admin/CreateUser";
import BookingHistory from "./user/BookingHistory";
import APJAuditorium from "./pages/Audis/APJAudi.jsx";
import PEBHall from "./pages/Audis/PEBHall.jsx";
import AdminScheduleViewer from "./admin/AdminScheduleViewer";
import Footer from "./components/Footer";
import AuditoriumDetails from "./pages/Audis/AuditoriumDetails";
import AddAuditorium from "./pages/Audis/AddAuditorium";
import AdminProfile from "./admin/AdminProfile";
import UserProfile from "./user/UserProfile";
import AuthDebug from "./components/AuthDebug";
import ScrollToTop from "./components/ScrollToTop";


function AppContent() {
    const location = useLocation();

    const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('authToken'));
    const [userRole, setUserRole] = useState(() => localStorage.getItem('userRole') || "");
    const [userEmail, setUserEmail] = useState(() => localStorage.getItem('userEmail') || "");

    useEffect(() => { const handler = () => { setIsLoggedIn(!!localStorage.getItem('authToken')); setUserRole(localStorage.getItem('userRole') || ""); setUserEmail(localStorage.getItem('userEmail') || ""); }; window.addEventListener('storage', handler); return () => { window.removeEventListener('storage', handler); }; }, []);

    return (
        <div className="flex flex-col min-h-screen">
            <ScrollToTop />
            <Navbar isLoggedIn={isLoggedIn} userRole={userRole} setIsLoggedIn={setIsLoggedIn} setUserRole={setUserRole} setUserEmail={setUserEmail} />
            {/* Spacer to offset the fixed Navbar height so content isn't hidden */}
            <div className="h-20 md:h-24" aria-hidden="true"></div>
            <main className="flex-grow">
                <Routes>
                    {/* Public Routes */}
                    {/* --- MODIFIED LINE BELOW --- */}
                    <Route path="/" element={<Homepage isLoggedIn={isLoggedIn} userRole={userRole} />} />
                    {/* --- END MODIFICATION --- */}
                    <Route path="/auditoriums" element={<Auditoriums isLoggedIn={isLoggedIn} userRole={userRole} />} />
                    <Route path="/auditorium/:id" element={<AuditoriumDetails isLoggedIn={isLoggedIn} userRole={userRole} />} />
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
                                <Navigate to="/"/> // Redirect logged-in users away from login
                        ) : (
                            <Login
                                setIsLoggedIn={setIsLoggedIn}
                                setUserRole={setUserRole}
                                setUserEmail={setUserEmail}
                            />
                        )
                    } />

                    {/* Redirect admin-login to prevent direct access */}
                    <Route path="/admin-login" element={<Navigate to="/login" replace />} />

                    {/* User Routes */}
                    <Route path="/book-auditorium" element={isLoggedIn&&userRole==='user'?<BookAuditorium userEmail={userEmail}/>:<Navigate to="/login" replace state={{from:location.pathname}}/>} />
                    <Route path="/booking-history" element={isLoggedIn&&userRole==='user'?<BookingHistory />:<Navigate to="/login" replace state={{from:location.pathname}}/>} />
                    <Route path="/user/profile" element={isLoggedIn&&userRole==='user'?<UserProfile />:<Navigate to="/login" replace state={{from:location.pathname}}/>} />

                    {/* Admin Routes */}
                    <Route path="/admin-dashboard" element={isLoggedIn&&userRole==='admin'?<AdminDashboard />:<Navigate to="/login" replace state={{from:location.pathname}}/>} />
                    <Route path="/manage-bookings" element={isLoggedIn&&userRole==='admin'?<ManageBookings />:<Navigate to="/login" replace state={{from:location.pathname}}/>} />
                    <Route path="/admin/create-user" element={isLoggedIn&&userRole==='admin'?<CreateUser />:<Navigate to="/login" replace state={{from:location.pathname}}/>} />
                    <Route path="/admin/schedule-viewer" element={isLoggedIn&&userRole==='admin'?<AdminScheduleViewer />:<Navigate to="/login" replace state={{from:location.pathname}}/>} />
                    <Route path="/admin/add-auditorium" element={isLoggedIn&&userRole==='admin'?<AddAuditorium />:<Navigate to="/login" replace state={{from:location.pathname}}/>} />
                    <Route path="/admin/manage-auditoriums" element={isLoggedIn&&userRole==='admin'?<ManageAuditoriums />:<Navigate to="/login" replace state={{from:location.pathname}}/>} />
                    <Route path="/admin/auditoriums/:id" element={isLoggedIn&&userRole==='admin'?<EditAuditorium />:<Navigate to="/login" replace state={{from:location.pathname}}/>} />
                    <Route path="/admin/profile" element={isLoggedIn&&userRole==='admin'?<AdminProfile />:<Navigate to="/login" replace state={{from:location.pathname}}/>} />

                    {/* Debug Route - Remove in production */}
                    <Route path="/debug" element={<AuthDebug />} />

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