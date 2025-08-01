import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BACKEND_URL } from "../config.js";

function RoomHistory() {
  const [user, setUser] = useState(null);
  const [roomHistory, setRoomHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (token) {
          const response = await fetch(`${BACKEND_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
            // Fetch room history
            fetchRoomHistory(userData.id);
          } else {
            localStorage.removeItem("authToken");
            navigate("/login");
          }
        } else {
          navigate("/login");
        }
      } catch (error) {
        console.error("Auth check error:", error);
        navigate("/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const fetchRoomHistory = async (userId) => {
    try {
      console.log("Fetching room history for user:", userId);
      const response = await fetch(`${BACKEND_URL}/user/${userId}/rooms`);
      console.log("Room history response status:", response.status);
      if (response.ok) {
        const data = await response.json();
        console.log("Room history data:", data);
        setRoomHistory(data.rooms || []);
      } else {
        console.error("Failed to fetch room history:", response.status);
      }
    } catch (error) {
      console.error("Error fetching room history:", error);
    }
  };

  const copyRoomId = (roomId) => {
    navigator.clipboard.writeText(roomId);
    alert("Room ID copied to clipboard!");
  };

  const joinRoom = (roomId) => {
    // Store room ID in localStorage and navigate to home
    localStorage.setItem("roomId", roomId);
    navigate("/");
  };

  const deleteRoomFromHistory = async (roomId) => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/user/${user.id}/rooms/${roomId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log("Room deleted from history:", data);

        // Remove the room from local state
        setRoomHistory((prev) => prev.filter((room) => room.roomId !== roomId));

        alert("Room removed from history successfully!");
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to delete room from history");
      }
    } catch (error) {
      console.error("Error deleting room from history:", error);
      alert("Failed to delete room from history");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
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

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center pt-16">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-2xl w-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">Room History</h1>
          <button
            onClick={() => navigate("/")}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-300"
          >
            Back to Home
          </button>
        </div>

        <div className="mb-4">
          <p className="text-gray-600">
            Welcome back,{" "}
            <span className="font-semibold">{user?.username}</span>!
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Here are the rooms you've joined. Click on a room ID to copy it, or
            click "Join" to go back to home with that room ID.
          </p>
        </div>

        {roomHistory.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                ></path>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              No Rooms Yet
            </h3>
            <p className="text-gray-500">
              You haven't joined any rooms yet. Create or join a room to see it
              here!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {roomHistory.map((room, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 hover:bg-gray-50 transition duration-200"
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-mono">
                        {room.roomId}
                      </div>
                      <button
                        onClick={() => copyRoomId(room.roomId)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                        title="Copy Room ID"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                          ></path>
                        </svg>
                      </button>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      Joined: {formatDate(room.joinedAt)}
                      {room.lastVisited &&
                        room.lastVisited !== room.joinedAt && (
                          <span className="ml-2">
                            • Last visited: {formatDate(room.lastVisited)}
                          </span>
                        )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => joinRoom(room.roomId)}
                      className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition duration-300"
                    >
                      Join
                    </button>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            `Are you sure you want to remove room ${room.roomId} from your history?`
                          )
                        ) {
                          deleteRoomFromHistory(room.roomId);
                        }
                      }}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition duration-300"
                      title="Remove from history"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        ></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2">How to use:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>
              • <strong>Copy Room ID:</strong> Click the copy icon next to any
              room ID
            </li>
            <li>
              • <strong>Join Room:</strong> Click "Join" to go back to home with
              that room ID pre-filled
            </li>
            <li>
              • <strong>Remember Password:</strong> You'll need to enter the
              room password when joining
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default RoomHistory;
