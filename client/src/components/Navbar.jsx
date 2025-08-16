import React, { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

const Navbar = ({ isLoggedIn, userRole, setIsLoggedIn, setUserRole, setUserEmail }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const isLoginPage = location.pathname.toLowerCase() === '/login';
    // const isHomePage = location.pathname === '/'; // Check if the current page is the home page

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

    const [menuOpen, setMenuOpen] = useState(false);
    return (
        <>
            <nav className={`fixed top-0 left-0 right-0 p-4 shadow-md z-50 bg-white transition-all duration-300`}>
                <div className="container mx-auto flex items-center justify-between">
                    <div className="flex items-center">
                        <a href="/">
                            <img
                                src="http://automation.vnrvjiet.ac.in/EduPrime2/Content/Img/logo.png"
                                alt="VNR VJIET Symbol"
                                className="h-12 w-12 sm:h-16 sm:w-16 flex-shrink-0"
                            />
                        </a>
                        <a href="/">
                        <div className="ml-2">
                            <h1 className="text-lg sm:text-xl font-bold text-red-900 leading-tight">
                                Vallurupalli Nageswara Rao <br className="hidden sm:inline" />Vignana Jyothi Institute
                            </h1>
                            <p className="text-xs sm:text-sm text-red-900">Vignana Jyothi Nagar, Hyderabad</p>
                        </div>
                        </a>
                    </div>
                    {/* Hamburger for mobile */}
                    <button
                        className="md:hidden flex items-center px-3 py-2 border rounded text-red-900 border-red-900 hover:text-yellow-600 ml-2"
                        onClick={() => setMenuOpen((open) => !open)}
                        aria-label="Toggle navigation menu"
                    >
                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                    {/* Desktop menu */}
                    <ul className="hidden md:flex flex-wrap space-x-1 sm:space-x-2 items-center text-sm sm:text-base">
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
                                        <li>
                                            <NavLink to="/user/profile" className={getNavLinkClass}>
                                                Profile
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
                                            <NavLink to="/admin/profile" className={getNavLinkClass}>
                                                Profile
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
                {/* Mobile menu dropdown */}
                {menuOpen && (
                    <ul className="md:hidden flex flex-col space-y-2 absolute right-4 top-16 bg-white rounded-xl p-4 shadow-2xl text-red-900 min-w-[160px] z-50 transition-all duration-200">
                        <li>
                            <NavLink to="/" className={getNavLinkClass} end onClick={() => setMenuOpen(false)}>
                                Home
                            </NavLink>
                        </li>
                        {!isLoggedIn && (
                            <>
                                <li>
                                    <NavLink to="/auditoriums" className={getNavLinkClass} onClick={() => setMenuOpen(false)}>
                                        Auditoriums
                                    </NavLink>
                                </li>
                                {!isLoginPage && (
                                    <li>
                                        <NavLink to="/login" className={getNavLinkClass} onClick={() => setMenuOpen(false)}>
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
                                            <NavLink to="/book-auditorium" className={getNavLinkClass} onClick={() => setMenuOpen(false)}>
                                                Book Auditorium
                                            </NavLink>
                                        </li>
                                        <li>
                                            <NavLink to="/booking-history" className={getNavLinkClass} onClick={() => setMenuOpen(false)}>
                                                History
                                            </NavLink>
                                        </li>
                                        <li>
                                            <NavLink to="/user/profile" className={getNavLinkClass} onClick={() => setMenuOpen(false)}>
                                                Profile
                                            </NavLink>
                                        </li>
                                    </>
                                )}
                                {userRole === "admin" && (
                                    <>
                                        <li>
                                            <NavLink to="/admin-dashboard" className={getNavLinkClass} onClick={() => setMenuOpen(false)}>
                                                Dashboard
                                            </NavLink>
                                        </li>
                                        <li>
                                            <NavLink to="/admin/profile" className={getNavLinkClass} onClick={() => setMenuOpen(false)}>
                                                Profile
                                            </NavLink>
                                        </li>
                                    </>
                                )}
                                <li>
                                    <button
                                        onClick={() => { setMenuOpen(false); handleLogout(); }}
                                        className={`${baseNavLinkClass} ${defaultNavLinkHoverClass} bg-transparent border-none cursor-pointer p-0 px-2 py-1`}
                                    >
                                        Logout
                                    </button>
                                </li>
                            </>
                        )}
                    </ul>
                )}
            </nav>
        </>
    );
};

export default Navbar;