import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      console.error('Authentication error:', error);
      navigate('/login?error=auth_failed');
      return;
    }

    if (token) {
      // Store the token in localStorage
      localStorage.setItem('authToken', token);
      
      // Trigger auth state change event
      window.dispatchEvent(new Event('authStateChanged'));
      
      // Redirect to home page
      navigate('/');
    } else {
      navigate('/login?error=no_token');
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-800">Completing sign in...</h2>
        <p className="text-gray-600 mt-2">Please wait while we authenticate your account</p>
      </div>
    </div>
  );
};

export default AuthCallback; 