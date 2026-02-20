import React, { useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { profileAPI } from "../services/profileAPI";

const Navbar = ({ isLoggedIn, userRole }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const isLoginPage = location.pathname.toLowerCase() === '/login';

    const [avatarUrl, setAvatarUrl] = useState("");
    const [avatarInitial, setAvatarInitial] = useState("U");

    useEffect(() => {
        let ignore = false;
        async function loadAvatar() {
            try {
                if (!isLoggedIn) { setAvatarUrl(""); return; }
                const res = await profileAPI.getProfile();
                if (!ignore && res?.success) {
                    const u = res.data;
                    const pic = u?.profile?.profilePicture;
                    if (pic) {
                        const base = import.meta.env.VITE_API_URL || 'http://localhost:5001';
                        setAvatarUrl(`${base}${pic}`);
                    } else {
                        const name = (u?.profile?.fullName || `${u?.profile?.firstName || ''} ${u?.profile?.lastName || ''}` || u?.username || 'User').trim();
                        setAvatarInitial((name || 'U').charAt(0).toUpperCase());
                        setAvatarUrl("");
                    }
                }
            } catch {
                // silent fail
            }
        }
        loadAvatar();
        return () => { ignore = true; };
    }, [isLoggedIn]);

    const baseNavLinkClass = "px-2 py-1 rounded-md transition-colors duration-150 no-underline text-red-900";
    const activeNavLinkClass = "bg-red-100 font-semibold";
    const defaultNavLinkHoverClass = "hover:text-yellow-600 hover:bg-red-50";

    const getNavLinkClass = ({ isActive }) => {
        return `${baseNavLinkClass} ${isActive ? activeNavLinkClass : defaultNavLinkHoverClass}`;
    };

    const [menuOpen, setMenuOpen] = useState(false);
    return (
        <>
            <nav className={`fixed top-0 left-0 right-0 pt-2 pb-2 px-0 z-50 transition-all duration-300 bg-white/10 backdrop-blur-md shadow-sm`}>
                <div className="container mx-auto flex items-center justify-between">
                    <div className="flex items-center">
                        <NavLink to="/">
                            <img
                                src="http://automation.vnrvjiet.ac.in/EduPrime2/Content/Img/logo.png"
                                alt="VNR VJIET Symbol"
                                className="h-12 w-12 sm:h-16 sm:w-16 flex-shrink-0"
                            />
                        </NavLink>
                        <NavLink to="/">
                        <div className="ml-2">
                            <h1 className={`text-lg sm:text-xl font-bold leading-tight text-red-900`}>
                                Vallurupalli Nageswara Rao <br className="hidden sm:inline" />Vignana Jyothi Institute
                            </h1>
                            <p className={`text-xs sm:text-sm text-red-900`}>Vignana Jyothi Nagar, Hyderabad</p>
                        </div>
                        </NavLink>
                    </div>
                    {/* Hamburger for mobile */}
                    <button
                        className={`md:hidden flex items-center px-3 py-2 border rounded ml-2 text-red-900 border-red-900 hover:text-yellow-600`}
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
                                    </>
                                )}
                                {userRole === "admin" && (
                                    <>
                                        <li>
                                            <NavLink to="/admin-dashboard" className={getNavLinkClass}>
                                                Dashboard
                                            </NavLink>
                                        </li>
                                    </>
                                )}
                                <li>
                                    <button
                                        onClick={() => navigate(userRole === 'admin' ? '/admin/profile' : '/user/profile')}
                                        className={`ml-2 flex items-center justify-center w-9 h-9 rounded-full overflow-hidden border border-red-200 bg-white/40 hover:bg-white/60`}
                                        aria-label="Open Profile"
                                    >
                                        {avatarUrl ? (
                                            <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <span className={`text-red-900 font-semibold`}>{avatarInitial}</span>
                                        )}
                                    </button>
                                </li>
                            </>
                        )}
                    </ul>
                </div>
                {/* Mobile menu dropdown */}
                {menuOpen && (
                    <ul className="md:hidden flex flex-col space-y-2 absolute right-4 top-16 bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-2xl text-red-900 min-w-[160px] z-50 transition-all duration-200">
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
                                    </>
                                )}
                                {userRole === "admin" && (
                                    <>
                                        <li>
                                            <NavLink to="/admin-dashboard" className={getNavLinkClass} onClick={() => setMenuOpen(false)}>
                                                Dashboard
                                            </NavLink>
                                        </li>
                                    </>
                                )}
                                <li>
                                    <button
                                        onClick={() => { setMenuOpen(false); navigate(userRole === 'admin' ? '/admin/profile' : '/user/profile'); }}
                                        className={`${baseNavLinkClass} ${defaultNavLinkHoverClass} flex items-center gap-2`}
                                    >
                                        <span>Profile</span>
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