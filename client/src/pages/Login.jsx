import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import clgss from "../assets/clgss.jpg"; // Ensure this path is correct

// Receive the state setters from App.jsx
const Login = ({ setIsLoggedIn, setUserRole, setUserEmail }) => {
  const [role, setRole] = useState("admin"); // Default role
  const [email, setEmail] = useState(""); // Input field state (email or username)
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true); setError("");

    const loginEndpoint = role === "admin" ? "/api/auth/admin-login" : "/api/auth/user-login";
    const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${loginEndpoint}`;
    console.log(`[DEBUG] Attempting login to: ${apiUrl} as ${role}`);

    try {
      const response = await fetch(apiUrl, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email, password }),
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
           {/* Email/Username Input with Icon */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1" htmlFor="emailInput">Email or Username</label>
            <div className="relative">
                {/* Icon */}
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </span>
                <input
                  id="emailInput"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@vnrvjiet.in or username"
                   className={`${inputBaseClass} ${inputBorderClass}`}
                  required
                  disabled={isLoading}
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
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`${inputBaseClass} ${inputBorderClass}`}
                  required
                  disabled={isLoading}
                />
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