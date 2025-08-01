import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../socket";
import { BACKEND_URL } from "../config.js";

function Home() {
  const [roomId, setRoomId] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showUsernamePrompt, setShowUsernamePrompt] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [pendingRoomId, setPendingRoomId] = useState(null);
  const [showRoomError, setShowRoomError] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRoomCreated, setShowRoomCreated] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState("");
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [showRepoSelection, setShowRepoSelection] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [githubRepos, setGithubRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [customRepoUrl, setCustomRepoUrl] = useState("");
  const [repoSelectionType, setRepoSelectionType] = useState("select"); // 'select', 'custom', or 'create'
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoDescription, setNewRepoDescription] = useState("");
  const [newRepoPrivate, setNewRepoPrivate] = useState(false);
  const [creatingRepo, setCreatingRepo] = useState(false);
  const [createdRepo, setCreatedRepo] = useState(null);
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

  const generateRoom = () => {
    // Generate a unique room ID using UUID
    const newRoomId = crypto.randomUUID().replace(/-/g, "").substring(0, 12);
    setCreatedRoomId(newRoomId);
    setShowPasswordPrompt(true);
  };

  const fetchGithubRepos = async () => {
    try {
      setLoadingRepos(true);
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${BACKEND_URL}/github/repos`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setGithubRepos(data.repos || []);
      } else {
        const errorData = await response.json();
        console.error("Failed to fetch GitHub repos:", errorData.error);
        // If GitHub access is not configured, suggest using custom URL
        if (errorData.useCustomUrl) {
          setRepoSelectionType("custom");
        }
      }
    } catch (error) {
      console.error("Error fetching GitHub repos:", error);
      // On error, default to custom URL option
      setRepoSelectionType("custom");
    } finally {
      setLoadingRepos(false);
    }
  };

  const createNewRepository = async () => {
    if (!newRepoName.trim()) {
      alert("Please enter a repository name");
      return;
    }

    try {
      setCreatingRepo(true);
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${BACKEND_URL}/github/create-repo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repoName: newRepoName.trim(),
          description: newRepoDescription.trim(),
          isPrivate: newRepoPrivate,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCreatedRepo(data.repository);
        setCustomRepoUrl(data.repository.html_url);
        setRepoSelectionType("custom");
        alert(`Repository "${data.repository.name}" created successfully!`);
      } else {
        const errorData = await response.json();
        alert(`Failed to create repository: ${errorData.error}`);
      }
    } catch (error) {
      console.error("Error creating repository:", error);
      alert("Failed to create repository. Please try again.");
    } finally {
      setCreatingRepo(false);
    }
  };

  const validatePassword = (password) => {
    if (password.length < 4) {
      return "Password must be at least 4 characters long";
    }
    if (password.length > 20) {
      return "Password must be less than 20 characters";
    }
    if (!/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/.test(password)) {
      return "Password can only contain letters, numbers, and special characters";
    }
    return null;
  };

  const createRoom = async () => {
    const validationError = validatePassword(password);
    if (validationError) {
      setPasswordError(validationError);
      return;
    }

    // Get the selected repository URL
    let githubRepo = null;
    if (repoSelectionType === "select" && selectedRepo) {
      const repo = githubRepos.find((r) => r.id.toString() === selectedRepo);
      githubRepo = repo ? repo.html_url : null;
    } else if (repoSelectionType === "custom" && customRepoUrl.trim()) {
      githubRepo = customRepoUrl.trim();
    }

    try {
      console.log("Sending room creation request:", {
        roomId: createdRoomId,
        password: password,
        createdBy: user?.username || "unknown",
        githubRepo: githubRepo,
      });

      // Create room on backend
      const response = await fetch(`${BACKEND_URL}/room/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId: createdRoomId,
          password: password,
          createdBy: user?.username || "unknown",
          githubRepo: githubRepo,
        }),
      });

      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);

      if (response.ok) {
        setShowRepoSelection(false);
        setShowRoomCreated(true);
        setPassword("");
        setPasswordError("");
        setSelectedRepo("");
        setCustomRepoUrl("");
        setRepoSelectionType("select");
        setNewRepoName("");
        setNewRepoDescription("");
        setNewRepoPrivate(false);
        setCreatedRepo(null);
      } else {
        console.error("Room creation failed:", data);
        setPasswordError(data.error || "Failed to create room");
      }
    } catch (error) {
      console.error("Create room error:", error);
      setPasswordError("Failed to create room. Please try again.");
    }
  };

  const checkRoomExists = async (roomId) => {
    try {
      const response = await fetch(`${BACKEND_URL}/room/${roomId}/exists`);
      if (!response.ok) {
        throw new Error("Failed to check room status");
      }
      const { exists } = await response.json();
      return exists;
    } catch (error) {
      console.error("Room check error:", error);
      return false;
    }
  };

  const joinRoom = async (e) => {
    e.preventDefault();
    if (!roomId.trim() || !roomPassword.trim()) {
      setShowRoomError("Please enter both Room ID and Password");
      return;
    }

    try {
      console.log("Joining room with data:", {
        roomId: roomId.trim(),
        password: roomPassword.trim(),
        userId: user?.id,
      });

      const response = await fetch(`${BACKEND_URL}/room/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId: roomId.trim(),
          password: roomPassword.trim(),
          userId: user?.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPendingRoomId(roomId.trim());
        setShowUsernamePrompt(true);
      } else {
        setShowRoomError(data.error || "Failed to join room");
        setTimeout(() => setShowRoomError(""), 3000);
      }
    } catch (error) {
      console.error("Join room error:", error);
      setShowRoomError("Failed to join room. Please try again.");
      setTimeout(() => setShowRoomError(""), 3000);
    }
  };

  const handleUsernameSubmit = (e) => {
    e.preventDefault();
    // Use GitHub username automatically
    const githubUsername = user?.username || "unknown";

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
    alert("Room ID copied to clipboard!");
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
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Set Room Password
            </h1>
            <p className="text-gray-600">
              Your room ID is:{" "}
              <span className="font-mono font-bold text-blue-600">
                {createdRoomId}
              </span>
            </p>
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
                  setPasswordError("");
                }}
                placeholder="Enter a password for your room"
                className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-gray-600"
              />
              {passwordError && (
                <p className="text-red-500 text-sm mt-1">{passwordError}</p>
              )}
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">
                Password Rules:
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• At least 4 characters long</li>
                <li>• Maximum 20 characters</li>
                <li>• Letters, numbers, and special characters only</li>
              </ul>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowPasswordPrompt(false);
                  setShowRepoSelection(true);
                  fetchGithubRepos();
                }}
                className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition duration-300"
              >
                Next
              </button>
              <button
                onClick={() => {
                  setShowPasswordPrompt(false);
                  setCreatedRoomId("");
                  setPassword("");
                  setPasswordError("");
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

  if (showRepoSelection) {
    return (
      <div className="min-h-screen bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center pt-16">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              GitHub Repository
            </h1>
            <p className="text-gray-600">
              Choose a repository for your project
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex space-x-2 mb-4">
              <button
                onClick={() => setRepoSelectionType("select")}
                className={`flex-1 py-2 px-4 rounded-lg transition duration-300 ${
                  repoSelectionType === "select"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Select Existing
              </button>
              <button
                onClick={() => setRepoSelectionType("create")}
                className={`flex-1 py-2 px-4 rounded-lg transition duration-300 ${
                  repoSelectionType === "create"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Create New
              </button>
              <button
                onClick={() => setRepoSelectionType("custom")}
                className={`flex-1 py-2 px-4 rounded-lg transition duration-300 ${
                  repoSelectionType === "custom"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Enter URL
              </button>
            </div>

            {repoSelectionType === "select" ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Repository
                </label>
                {loadingRepos ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">
                      Loading repositories...
                    </p>
                  </div>
                ) : (
                  <select
                    value={selectedRepo}
                    onChange={(e) => setSelectedRepo(e.target.value)}
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                  >
                    <option value="">Choose a repository...</option>
                    {githubRepos.map((repo) => (
                      <option key={repo.id} value={repo.id}>
                        {repo.full_name} {repo.private ? "(Private)" : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ) : repoSelectionType === "create" ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Repository Name *
                  </label>
                  <input
                    type="text"
                    value={newRepoName}
                    onChange={(e) => setNewRepoName(e.target.value)}
                    placeholder="my-hackathon-project"
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-gray-600"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Only lowercase letters, numbers, and hyphens allowed
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description (optional)
                  </label>
                  <input
                    type="text"
                    value={newRepoDescription}
                    onChange={(e) => setNewRepoDescription(e.target.value)}
                    placeholder="A brief description of your project"
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-gray-600"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="private-repo"
                    checked={newRepoPrivate}
                    onChange={(e) => setNewRepoPrivate(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label
                    htmlFor="private-repo"
                    className="ml-2 block text-sm text-gray-700"
                  >
                    Make this repository private
                  </label>
                </div>

                <button
                  onClick={createNewRepository}
                  disabled={!newRepoName.trim() || creatingRepo}
                  className="w-full bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingRepo ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating Repository...
                    </div>
                  ) : (
                    "Create Repository"
                  )}
                </button>

                {createdRepo && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <svg
                        className="w-5 h-5 text-green-500 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        ></path>
                      </svg>
                      <span className="text-sm font-medium text-green-800">
                        Repository created successfully!
                      </span>
                    </div>
                    <p className="text-xs text-green-700 mt-1">
                      {createdRepo.html_url}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Repository URL
                </label>
                <input
                  type="url"
                  value={customRepoUrl}
                  onChange={(e) => setCustomRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/repository"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-gray-600"
                />
              </div>
            )}

            <div className="bg-blue-50 p-3 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">
                Repository Info:
              </h3>
              <p className="text-sm text-blue-700">
                {repoSelectionType === "select" && selectedRepo ? (
                  (() => {
                    const repo = githubRepos.find(
                      (r) => r.id.toString() === selectedRepo
                    );
                    return repo ? (
                      <>
                        <strong>{repo.full_name}</strong>
                        <br />
                        {repo.description && (
                          <span>
                            {repo.description}
                            <br />
                          </span>
                        )}
                        <span className="text-xs">
                          Last updated:{" "}
                          {new Date(repo.updated_at).toLocaleDateString()}
                        </span>
                      </>
                    ) : (
                      "Select a repository to see details"
                    );
                  })()
                ) : repoSelectionType === "create" ? (
                  <>
                    <strong>Create New Repository</strong>
                    <br />
                    <span className="text-xs">
                      Enter repository details above to create a new repository
                      on your GitHub account
                    </span>
                  </>
                ) : repoSelectionType === "custom" && customRepoUrl ? (
                  <>
                    <strong>Custom URL:</strong>
                    <br />
                    <span className="text-xs break-all">{customRepoUrl}</span>
                  </>
                ) : (
                  "Choose a repository option above"
                )}
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={createRoom}
                disabled={
                  !(
                    (repoSelectionType === "select" && selectedRepo) ||
                    (repoSelectionType === "custom" && customRepoUrl.trim()) ||
                    (repoSelectionType === "create" && createdRepo)
                  )
                }
                className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Room
              </button>
              <button
                onClick={() => {
                  setShowRepoSelection(false);
                  setShowPasswordPrompt(true);
                }}
                className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600 transition duration-300"
              >
                Back
              </button>
            </div>

            <div className="text-center">
              <button
                onClick={() => {
                  setSelectedRepo("");
                  setCustomRepoUrl("");
                  setRepoSelectionType("select");
                  createRoom();
                }}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Skip repository selection
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
              <svg
                className="w-16 h-16 text-green-500 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                Room Created Successfully!
              </h1>
              <p className="text-gray-600 mb-6">
                Share this room ID with your teammates
              </p>
            </div>

            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room ID
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={createdRoomId}
                  readOnly
                  className="flex-1 p-3 border rounded-lg bg-white font-mono text-lg text-black"
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
                  setCreatedRoomId("");
                  setShowRoomError("");
                }}
                className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition duration-300"
              >
                Create Another Room
              </button>
              <button
                onClick={() => {
                  setShowRoomCreated(false);
                  setCreatedRoomId("");
                  setShowRoomError("");
                  navigate("/");
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
            <h1 className="text-4xl font-bold text-center mb-4 text-gray-800">
              Welcome to the Hackathon Timer
            </h1>
            <p className="text-center mb-8 text-gray-600">
              Create a new room or join an existing one to collaborate with your
              team.
            </p>

            {/* Create Room Section */}
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-3 text-gray-800">
                Create New Room
              </h2>
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
              <h2 className="text-xl font-semibold mb-3 text-gray-800">
                Join Existing Room
              </h2>
              <form onSubmit={joinRoom} className="space-y-3">
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="Enter Room ID"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-gray-600"
                />
                <input
                  type="password"
                  value={roomPassword}
                  onChange={(e) => setRoomPassword(e.target.value)}
                  placeholder="Enter room password"
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-gray-600"
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
            <h2 className="text-2xl font-bold text-center mb-6">
              Join Room: {pendingRoomId}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <div className="w-full p-3 border rounded-lg bg-gray-50">
                  <span className="text-gray-800 font-medium">
                    {user?.username || "unknown"}
                  </span>
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
                    setRoomId("");
                    setRoomPassword("");
                    setShowRoomError("");
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
