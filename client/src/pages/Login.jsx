import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import clgss from "../assets/clgss.jpg"; // Ensure this path is correct

// Receive the state setters from App.jsx
const Login = ({ setIsLoggedIn, setUserRole, setUserEmail }) => {
  const [role, setRole] = useState("admin"); // Default role
  const [email, setEmail] = useState(""); // Input field state (email only)
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const passwordTimeout = useRef(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    // Validate email domain (case-insensitive check)
    if (!email.toLowerCase().endsWith('@vnrvjiet.in')) {
      setError("Please use a valid @vnrvjiet.in email address");
      return;
    }

    setIsLoading(true);
    setError("");

    // Normalize email to lowercase before sending to API
    const normalizedEmail = email.toLowerCase();

    const loginEndpoint = role === "admin" ? "/api/auth/admin-login" : "/api/auth/user-login";
    const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${loginEndpoint}`;
    console.log(`[DEBUG] Attempting login to: ${apiUrl} as ${role}`);
    console.log(`[DEBUG] Using email: ${normalizedEmail} (original: ${email})`);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          identifier: normalizedEmail, 
          password 
        }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || `Login failed (${response.status})`);

      // --- Login Success ---
      console.log('[DEBUG] Login success:', data);
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userRole', data.user.role);
      localStorage.setItem('userEmail', data.user.email);

      // Update App state
      setIsLoggedIn(true);
      setUserRole(data.user.role);
      setUserEmail(data.user.email);

      // Navigate
      if (data.user.role === "admin") navigate("/admin-dashboard");
      else navigate("/book-auditorium");

    } catch (err) {
      console.error("[DEBUG] Login CATCH ERROR:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setError(''); // Clear errors on role switch
    setEmail(''); // Optional: clear inputs on role switch
    setPassword(''); // Optional: clear inputs on role switch
  }

  const handlePasswordVisibility = (show) => {
    if (show) {
      setIsPasswordVisible(true);
      // Clear any existing timeout
      if (passwordTimeout.current) {
        clearTimeout(passwordTimeout.current);
      }
    } else {
      // Hide password after releasing the button
      setIsPasswordVisible(false);
    }
  };

  // Common input classes
  const inputBaseClass = "w-full p-2.5 pl-10 text-sm border rounded-lg focus:outline-none transition duration-150 ease-in-out";
  const inputBorderClass = error ? "border-red-400 focus:ring-1 focus:ring-red-500 focus:border-red-500" : "border-gray-300 focus:ring-1 focus:ring-red-500 focus:border-red-500";

  // Role button classes
  const activeRoleClass = "bg-red-800 text-white shadow-md";
  const inactiveRoleClass = "bg-gray-100 text-gray-600 hover:bg-gray-200";

  return (
    <div className="flex justify-center items-center min-h-screen p-4 bg-gray-100 relative">
      {/* Background Image with Dark Overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: `url(${clgss})` }}
      >
        <div className="absolute inset-0 bg-black opacity-50"></div> {/* Slightly darker overlay */}
      </div>

      {/* Login Card - Glass morphism effect */}
      <div className="w-full max-w-sm bg-white/70 backdrop-blur-md rounded-xl shadow-2xl p-6 sm:p-8 z-10">
        {/* Logo Inside Card with white background for visibility */}
        <div className="flex justify-center mb-4">
          <div className="bg-white p-1.5 rounded-full">
            <img
              src="http://automation.vnrvjiet.ac.in/EduPrime2/Content/Img/logo.png"
              alt="VNR VJIET Logo"
              className="h-16 w-16"
            />
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-900 mb-3">
          Auditorium Login
        </h2>

        {/* Update input styles for better contrast */}
        <style jsx>{`
          input::placeholder {
            color: rgba(55, 65, 81, 0.8);
          }
          input {
            background: rgba(255, 255, 255, 0.9);
          }
        `}</style>

        {/* Enhanced Role Switcher */}
        <div className="flex mb-4 rounded-lg border border-gray-300 overflow-hidden shadow-sm">
          <button
            type="button"
            className={`flex-1 py-2 px-3 text-sm font-semibold transition-colors duration-200 focus:outline-none focus:z-10 focus:ring-2 focus:ring-offset-1 focus:ring-red-500 ${role === "admin" ? activeRoleClass : inactiveRoleClass} rounded-l-md`}
            onClick={() => handleRoleChange("admin")}
            disabled={isLoading}
          >
            Admin
          </button>
          <button
            type="button"
            className={`flex-1 py-2 px-3 text-sm font-semibold transition-colors duration-200 focus:outline-none focus:z-10 focus:ring-2 focus:ring-offset-1 focus:ring-red-500 ${role === "user" ? activeRoleClass : inactiveRoleClass} rounded-r-md`}
            onClick={() => handleRoleChange("user")}
            disabled={isLoading}
          >
            User
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email Input with Icon */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1" htmlFor="emailInput">Email Address</label>
            <div className="relative">
              {/* Icon */}
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
              </span>
              <input
                id="emailInput"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@vnrvjiet.in"
                className={`${inputBaseClass} ${inputBorderClass}`}
                required
                disabled={isLoading}
                pattern=".+@vnrvjiet\.in$"
                title="Please enter a valid @vnrvjiet.in email address"
              />
            </div>
          </div>

          {/* Password Input with Icon */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1" htmlFor="passwordInput">Password</label>
            <div className="relative">
              {/* Icon */}
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 1 1 0 000-2zM8 8a1 1 100 2 1 1 0 000-2zm2 2a1 1 0 102 0 1 1 0 00-2 0z" clipRule="evenodd" />
                </svg>
              </span>
              <input
                id="passwordInput"
                type={isPasswordVisible ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className={`${inputBaseClass} ${inputBorderClass}`}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center group"
                onMouseDown={() => handlePasswordVisibility(true)}
                onMouseUp={() => handlePasswordVisibility(false)}
                onMouseLeave={() => handlePasswordVisibility(false)}
                onTouchStart={() => handlePasswordVisibility(true)}
                onTouchEnd={() => handlePasswordVisibility(false)}
                tabIndex="-1"
                aria-label={isPasswordVisible ? "Hide password" : "Show password"}
              >
                <div className="p-1.5 rounded-full transition-colors duration-200 group-hover:bg-gray-100 group-active:bg-gray-200">
                  <svg
                    className="h-4 w-4 text-gray-500 group-hover:text-gray-700 transition-colors duration-200"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    {isPasswordVisible ? (
                      // Eye icon when password is visible
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                      />
                    ) : (
                      // Eye-slash icon when password is hidden
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                      />
                    )}
                    {isPasswordVisible && (
                      <circle
                        cx="12"
                        cy="12"
                        r="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}
                  </svg>
                </div>
              </button>
            </div>
          </div>

          {/* Error Message Display */}
          {error && (
            <p className="text-sm text-red-700 bg-red-100 border border-red-200 p-3 rounded-lg text-center font-medium">
              {error}
            </p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className={`w-full py-2.5 px-4 text-base font-semibold rounded-lg text-white transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-700 shadow-md ${
              isLoading ? 'bg-red-400 cursor-not-allowed' : 'bg-red-800 hover:bg-red-900 active:bg-red-900'
            }`}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                Logging in...
              </span>
            ) : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;