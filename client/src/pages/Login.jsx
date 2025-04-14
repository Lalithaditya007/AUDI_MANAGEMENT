import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import clgss from "../assets/clgss.jpg"; // Ensure this path is correct

// Receive the state setters from App.jsx
const Login = ({ setIsLoggedIn, setUserRole, setUserEmail }) => {
  const [role, setRole] = useState("admin"); // Default role selection
  const [email, setEmail] = useState(""); // Input field state (for email or username)
  const [password, setPassword] = useState(""); // Input field state for password
  const [error, setError] = useState(""); // State for displaying login errors
  const [isLoading, setIsLoading] = useState(false); // State to manage loading indicator
  const navigate = useNavigate(); // Hook for programmatic navigation

  // --- Handle Login Submission ---
  const handleLogin = async (e) => {
    // --- DEBUG: Check if function starts ---
    console.log("--- [DEBUG] handleLogin function started ---");

    e.preventDefault(); // Prevent default form submission behavior
    setIsLoading(true); // Indicate loading state has started
    setError(""); // Clear any previous error messages

    // Determine the correct backend API endpoint based on the selected role
    const loginEndpoint = role === "admin" ? "/api/auth/admin-login" : "/api/auth/user-login";

    // --- VITE Environment Variable Fix ---
    // Construct the full API URL using import.meta.env for Vite
    const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5001'}${loginEndpoint}`;
    // --- End VITE Fix ---


    // --- DEBUG: Log details before fetch ---
    console.log(`[DEBUG] Role Selected: ${role}`);
    console.log(`[DEBUG] Target API URL: ${apiUrl}`);
    console.log(`[DEBUG] Identifier (Email/Username): ${email}`);
    console.log(`[DEBUG] Password Provided: ${password ? 'Yes' : 'No'}`);
    console.log(`[DEBUG] Data being sent:`, { identifier: email, password: '***' });

    // --- DEBUG: Check right before fetch call ---
    console.log("[DEBUG] About to initiate fetch...");

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifier: email, password }),
      });

      console.log(`[DEBUG] Fetch response received. Status: ${response.status}, StatusText: ${response.statusText}, OK: ${response.ok}`);
      console.log('[DEBUG] Attempting to parse response JSON...');
      const data = await response.json();
      console.log('[DEBUG] Response JSON parsed:', data);

      if (!response.ok) {
        console.error('[DEBUG] Response status was NOT OK. Throwing error.');
        throw new Error(data.message || `Login failed. Status: ${response.status}`);
      }

      // --- Login Successful ---
      console.log('[DEBUG] Login successful. Backend data:', data);
      console.log('[DEBUG] Updating application state...');


      // --- BEGIN: Store Auth Info in localStorage --- (STEP 1 CODE)
      if (data.token) {
        localStorage.setItem('authToken', data.token);
        console.log('[DEBUG] Auth token stored in localStorage.');
      } else {
        // This warning helps if the backend unexpectedly doesn't send a token
        console.warn('[DEBUG] No token received from backend on login.');
      }
      // Store role and email too, as they are useful
      if (data.user && data.user.role) {
        localStorage.setItem('userRole', data.user.role);
      }
      if (data.user && data.user.email) {
        localStorage.setItem('userEmail', data.user.email);
      }
      // --- END: Store Auth Info in localStorage ---


      // Update the global application state via props passed from App.jsx
      setIsLoggedIn(true);
      setUserRole(data.user.role);
      setUserEmail(data.user.email);


      // Optional: Token already stored above
      // localStorage.setItem('authToken', data.token);
      // console.log('[DEBUG] Auth token stored (if implemented).');
      console.log(`[DEBUG] Role from backend: ${data.user.role}. Determining navigation target...`);

      if (data.user.role === "admin") {
         console.log('[DEBUG] Navigating to /admin-dashboard');
        navigate("/admin-dashboard");
      } else {
        console.log('[DEBUG] Navigating to /book-auditorium');
        navigate("/book-auditorium");
      }
      console.log('[DEBUG] Navigation function called.');

    } catch (err) {
      console.error("[DEBUG] CATCH BLOCK ERROR:", err);
      console.error("[DEBUG] Error Message:", err.message);
      setError(err.message || "An unexpected error occurred. Please check console.");

    } finally {
      console.log("[DEBUG] FINALLY block executing.");
      setIsLoading(false);
    }
  };

  // --- Component Render ---
  return (
    <div
      className="flex justify-center items-center min-h-screen bg-cover bg-center"
      style={{ backgroundImage: `url(${clgss})` }}
    >
      <div
        className="w-full max-w-md p-6 rounded-lg shadow-md"
        style={{ backgroundColor: "rgba(255, 255, 255, 0.8)" }}
      >
        <h2 className="text-2xl font-bold text-center mb-4">
          {role === "admin" ? "Admin Login" : "User Login"}
        </h2>
        <div className="flex bg-gray-300 bg-opacity-30 rounded-xl mb-4 overflow-hidden">
          <button
            className={`flex-1 py-2 text-sm font-semibold transition-all duration-300 ${
              role === "admin"
                ? "bg-red-900 text-white"
                : "hover:bg-red-900 hover:text-white"
            }`}
            onClick={() => { setRole("admin"); setError(''); }}
            disabled={isLoading}
          >
            Admin
          </button>
          <button
            className={`flex-1 py-2 text-sm font-semibold transition-all duration-300 ${
              role === "user"
                ? "bg-red-900 text-white"
                : "hover:bg-red-900 hover:text-white"
            }`}
            onClick={() => { setRole("user"); setError('');}}
            disabled={isLoading}
          >
            User
          </button>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Email or Username</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email or username"
              className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 ${
                error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-red-900'
              }`}
              required
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className={`w-full p-2 border rounded-lg focus:outline-none focus:ring-2 ${
                error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-red-900'
              }`}
              required
              disabled={isLoading}
            />
          </div>
          {error && (
            <p className="text-red-600 text-sm text-center">{error}</p>
          )}
          <button
            type="submit"
            className="w-full py-2 bg-red-900 text-white text-sm font-semibold rounded-lg shadow-md hover:bg-red-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;