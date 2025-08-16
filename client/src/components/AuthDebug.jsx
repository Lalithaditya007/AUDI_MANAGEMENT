import React, { useState, useEffect } from 'react';

const AuthDebug = () => {
  const [token, setToken] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const authToken = localStorage.getItem('authToken');
    setToken(authToken);
    
    if (authToken) {
      testProfileAPI(authToken);
    }
  }, []);

  const testProfileAPI = async (authToken) => {
    try {
      const response = await fetch('http://localhost:5001/api/profile', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setProfileData(data);
      } else {
        setError(data.message || 'Failed to fetch profile');
      }
    } catch (error) {
      setError('Network error: ' + error.message);
    }
  };

  const loginTestUser = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/auth/admin-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          identifier: 'admin@example.com',
          password: 'admin123'
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('authToken', data.token);
        setToken(data.token);
        setError('');
        testProfileAPI(data.token);
      } else {
        setError('Login failed: ' + data.message);
      }
    } catch (error) {
      setError('Login error: ' + error.message);
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
    setProfileData(null);
    setError('');
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication Debug</h1>
      
      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold mb-2">Token Status:</h2>
          <p className="text-sm text-gray-600">
            {token ? `Token exists: ${token.substring(0, 20)}...` : 'No token found'}
          </p>
        </div>
        
        <div className="space-x-2">
          {!token && (
            <button 
              onClick={loginTestUser}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Login as Admin
            </button>
          )}
          
          {token && (
            <button 
              onClick={logout}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Logout
            </button>
          )}
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>Error:</strong> {error}
          </div>
        )}
        
        {profileData && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            <h3 className="font-semibold mb-2">Profile Data:</h3>
            <pre className="text-xs overflow-auto">
              {JSON.stringify(profileData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthDebug;
