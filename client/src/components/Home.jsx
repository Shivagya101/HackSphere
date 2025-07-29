import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';

function Home() {
  const [roomId, setRoomId] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [pendingRoomId, setPendingRoomId] = useState(null);
  const [showRoomError, setShowRoomError] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRoomCreated, setShowRoomCreated] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          const response = await fetch('http://localhost:3000/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            localStorage.removeItem('authToken');
            navigate('/login');
          }
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const generateRoom = () => {
    // Generate a unique room ID using UUID
    const newRoomId = crypto.randomUUID().replace(/-/g, '').substring(0, 12);
    setCreatedRoomId(newRoomId);
    setShowPasswordPrompt(true);
  };

  const validatePassword = (password) => {
    if (password.length < 4) {
      return 'Password must be at least 4 characters long';
    }
    if (password.length > 20) {
      return 'Password must be less than 20 characters';
    }
    if (!/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/.test(password)) {
      return 'Password can only contain letters, numbers, and special characters';
    }
    return null;
  };

  const createRoom = async () => {
    const validationError = validatePassword(password);
    if (validationError) {
      setPasswordError(validationError);
      return;
    }

    try {
      console.log('Sending room creation request:', {
        roomId: createdRoomId,
        password: password,
        createdBy: user?.username || 'unknown'
      });
      
      // Create room on backend
      const response = await fetch('http://localhost:3000/room/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: createdRoomId,
          password: password,
          createdBy: user?.username || 'unknown'
        })
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);
      
      if (response.ok) {
        setShowPasswordPrompt(false);
        setShowRoomCreated(true);
        setPassword('');
        setPasswordError('');
      } else {
        console.error('Room creation failed:', data);
        setPasswordError(data.error || 'Failed to create room');
      }
    } catch (error) {
      console.error('Create room error:', error);
      setPasswordError('Failed to create room. Please try again.');
    }
  };

  const checkRoomExists = async (roomId) => {
    try {
      const response = await fetch(`http://localhost:3000/room/${roomId}/exists`);
      if (!response.ok) {
        throw new Error('Failed to check room status');
      }
      const { exists } = await response.json();
      return exists;
    } catch (error) {
      console.error('Room check error:', error);
      return false;
    }
  };

  const joinRoom = async (e) => {
    e.preventDefault();
    if (!roomId.trim() || !roomPassword.trim()) {
      setShowRoomError('Please enter both Room ID and Password');
      return;
    }

    try {
      console.log('Joining room with data:', {
        roomId: roomId.trim(),
        password: roomPassword.trim(),
        userId: user?.id
      });

      const response = await fetch('http://localhost:3000/room/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: roomId.trim(),
          password: roomPassword.trim(),
          userId: user?.id
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setPendingRoomId(roomId.trim());
        setShowUsernamePrompt(true);
      } else {
        setShowRoomError(data.error || 'Failed to join room');
        setTimeout(() => setShowRoomError(''), 3000);
      }
    } catch (error) {
      console.error('Join room error:', error);
      setShowRoomError('Failed to join room. Please try again.');
      setTimeout(() => setShowRoomError(''), 3000);
    }
  };

  const handleUsernameSubmit = (e) => {
    e.preventDefault();
    // Use GitHub username automatically
    const githubUsername = user?.username || 'unknown';
    
    // stores username in localStorage
    localStorage.setItem("username", githubUsername);
    localStorage.setItem("roomId", pendingRoomId);
    
    // join room
    socket.emit("joinRoom", {
      roomId: pendingRoomId,
      username: githubUsername,
    });

    navigate(`/room/${pendingRoomId}`);
  };



  const copyRoomId = () => {
    navigator.clipboard.writeText(createdRoomId);
    alert('Room ID copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center pt-16">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-800">Loading...</h2>
        </div>
      </div>
    );
  }

  if (showPasswordPrompt) {
    return (
      <div className="min-h-screen bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center pt-16">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Set Room Password</h1>
            <p className="text-gray-600">Your room ID is: <span className="font-mono font-bold text-blue-600">{createdRoomId}</span></p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                placeholder="Enter a password for your room"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {passwordError && (
                <p className="text-red-500 text-sm mt-1">{passwordError}</p>
              )}
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">Password Rules:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• At least 4 characters long</li>
                <li>• Maximum 20 characters</li>
                <li>• Letters, numbers, and special characters only</li>
              </ul>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={createRoom}
                className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition duration-300"
              >
                Create Room
              </button>
              <button
                onClick={() => {
                  setShowPasswordPrompt(false);
                  setCreatedRoomId('');
                  setPassword('');
                  setPasswordError('');
                }}
                className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600 transition duration-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showRoomCreated) {
    return (
      <div className="min-h-screen bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center pt-16">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="mb-6">
              <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
              </svg>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Room Created Successfully!</h1>
              <p className="text-gray-600 mb-6">Share this room ID with your teammates</p>
            </div>
            
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Room ID</label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={createdRoomId}
                  readOnly
                  className="flex-1 p-3 border rounded-lg bg-white font-mono text-lg"
                />
                <button
                  onClick={copyRoomId}
                  className="px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-300"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowRoomCreated(false);
                  setCreatedRoomId('');
                  setShowRoomError('');
                }}
                className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition duration-300"
              >
                Create Another Room
              </button>
              <button
                onClick={() => {
                  setShowRoomCreated(false);
                  setCreatedRoomId('');
                  setShowRoomError('');
                  navigate('/');
                }}
                className="w-full bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600 transition duration-300"
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center pt-16">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        {!showUsernamePrompt ? (
          <>
            <h1 className="text-4xl font-bold text-center mb-4 text-gray-800">Welcome to the Hackathon Timer</h1>
            <p className="text-center mb-8 text-gray-600">Create a new room or join an existing one to collaborate with your team.</p>
            
            {/* Create Room Section */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3 text-gray-800">Create New Room</h2>
              <button 
                onClick={generateRoom}
                className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition duration-300"
              >
                Create New Room
              </button>
            </div>

            <div className="text-center mb-4 text-gray-500">OR</div>

            {/* Join Room Section */}
            <div>
              <h2 className="text-xl font-semibold mb-3 text-gray-800">Join Existing Room</h2>
              <form onSubmit={joinRoom} className="space-y-3">
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="Enter Room ID"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="password"
                  value={roomPassword}
                  onChange={(e) => setRoomPassword(e.target.value)}
                  placeholder="Enter room password"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition duration-300"
                >
                  Join Room
                </button>
              </form>
            </div>

            {showRoomError && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {showRoomError}
              </div>
            )}
          </>
        ) : (
          <div>
            <h2 className="text-2xl font-bold text-center mb-6">Join Room: {pendingRoomId}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <div className="w-full p-3 border rounded-lg bg-gray-50">
                  <span className="text-gray-800 font-medium">{user?.username || 'unknown'}</span>
                  <span className="text-gray-500 ml-2">(from GitHub)</span>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleUsernameSubmit}
                  className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition duration-300"
                >
                  Join Room
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowUsernamePrompt(false);
                    setPendingRoomId(null);
                    setRoomId('');
                    setRoomPassword('');
                    setShowRoomError('');
                  }}
                  className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600 transition duration-300"
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home; 