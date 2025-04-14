import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

const Navbar = ({ isLoggedIn, userRole, setIsLoggedIn, setUserRole, setUserEmail }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const isLoginPage = location.pathname.toLowerCase() === '/login';
    const isHomePage = location.pathname === '/'; // Check if the current page is the home page

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userEmail');
        console.log('[DEBUG] Cleared auth info from localStorage.');

        if (setIsLoggedIn) {
            setIsLoggedIn(false);
        } else {
            console.error("Error: setIsLoggedIn prop not passed to Navbar!");
        }
        if (setUserRole) setUserRole('');
        if (setUserEmail) setUserEmail('');

        navigate("/login");
    };

    const baseNavLinkClass = "px-2 py-1 rounded-md transition-colors duration-150 no-underline text-red-900";
    const activeNavLinkClass = "bg-red-100 font-semibold";
    const defaultNavLinkHoverClass = "hover:text-yellow-600 hover:bg-red-50";

    const getNavLinkClass = ({ isActive }) => {
        return `${baseNavLinkClass} ${isActive ? activeNavLinkClass : defaultNavLinkHoverClass}`;
    };

    return (
        <nav className={`p-4 shadow-md ${isHomePage ? "bg-transparent" : "bg-white"}`}>
            <div className="container mx-auto flex justify-between items-center flex-wrap">
                <div className="flex items-center space-x-4 mb-2 sm:mb-0 mr-4">
                    <img
                        src="http://automation.vnrvjiet.ac.in/EduPrime2/Content/Img/logo.png"
                        alt="VNR VJIET Symbol"
                        className="h-12 w-12 sm:h-16 sm:w-16 flex-shrink-0"
                    />
                    <div>
                        <h1 className="text-lg sm:text-xl font-bold text-red-900 leading-tight">
                            Vallurupalli Nageswara Rao <br className="hidden sm:inline" />Vignana Jyothi Institute
                        </h1>
                        <p className="text-xs sm:text-sm text-red-900">Vignana Jyothi Nagar, Hyderabad</p>
                    </div>
                </div>

                <ul className="flex flex-wrap space-x-1 sm:space-x-2 items-center text-sm sm:text-base">
                    <li>
                        <NavLink to="/" className={getNavLinkClass} end>
                            Home
                        </NavLink>
                    </li>
                    {!isLoggedIn && (
                        <>
                            <li>
                                <NavLink to="/auditoriums" className={getNavLinkClass}>
                                    Auditoriums
                                </NavLink>
                            </li>
                            {!isLoginPage && (
                                <li>
                                    <NavLink to="/login" className={getNavLinkClass}>
                                        Login
                                    </NavLink>
                                </li>
                            )}
                        </>
                    )}
                    {isLoggedIn && (
                        <>
                            {userRole === "user" && (
                                <>
                                    <li>
                                        <NavLink to="/book-auditorium" className={getNavLinkClass}>
                                            Book Auditorium
                                        </NavLink>
                                    </li>
                                    <li>
                                        <NavLink to="/booking-history" className={getNavLinkClass}>
                                            History
                                        </NavLink>
                                    </li>
                                </>
                            )}
                            {userRole === "admin" && (
                                <>
                                    <li>
                                        <NavLink to="/admin-dashboard" className={getNavLinkClass}>
                                            Dashboard
                                        </NavLink>
                                    </li>
                                    <li>
                                        <NavLink to="/manage-bookings" className={getNavLinkClass}>
                                            Manage
                                        </NavLink>
                                    </li>
                                    <li>
                                        <NavLink to="/admin/schedule-viewer" className={getNavLinkClass}>
                                            Schedule
                                        </NavLink>
                                    </li>
                                </>
                            )}
                            <li>
                                <button
                                    onClick={handleLogout}
                                    className={`${baseNavLinkClass} ${defaultNavLinkHoverClass} bg-transparent border-none cursor-pointer p-0 px-2 py-1`}
                                >
                                    Logout
                                </button>
                            </li>
                        </>
                    )}
                </ul>
            </div>
        </nav>
    );
};

export default Navbar;