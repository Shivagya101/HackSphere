import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from '../socket';

function Room() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [time, setTime] = useState(48 * 60 * 60); 
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [seconds, setSeconds] = useState('');
  const [showTimerEndAlert, setShowTimerEndAlert] = useState(false);
  const [username, setUsername] = useState('');
  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [isNewRoom, setIsNewRoom] = useState(false);
  const [showRoomAlert, setShowRoomAlert] = useState(false);
  const fileInputRef = useRef(null);
  const [timerStatus, setTimerStatus] = useState('paused');
  const [timerLastUpdateBy, setTimerLastUpdateBy] = useState('');
  const [hasJoined, setHasJoined] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [timerAlertShown, setTimerAlertShown] = useState(false);
  const [roomInfo, setRoomInfo] = useState(null);
  const [commits, setCommits] = useState([]);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('main');
  const [loadingBranches, setLoadingBranches] = useState(false);

  const saveRoomToHistory = async (roomId) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;

      const response = await fetch('http://localhost:3000/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('Saving room to history:', { roomId, userId: userData.id });
        
        // Call the backend to save room to history
        await fetch('http://localhost:3000/room/join', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            roomId,
            password: 'history-save', // Dummy password for history save
            userId: userData.id
          })
        });
      }
    } catch (error) {
      console.error('Error saving room to history:', error);
    }
  };

  const checkRoomExists = async () => {
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

  const fetchRoomData = async () => {
    try {
      console.log('Fetching room data directly for:', roomId);
      
      // Fetch room information
      const roomResponse = await fetch(`http://localhost:3000/room/${roomId}`);
      let roomData = null;
      if (roomResponse.ok) {
        roomData = await roomResponse.json();
        console.log('Fetched room info:', roomData);
        setRoomInfo(roomData);
      }

      // Fetch messages
      const messagesResponse = await fetch(`http://localhost:3000/messages/${roomId}`);
      if (messagesResponse.ok) {
        const messages = await messagesResponse.json();
        console.log('Fetched messages:', messages.length);
        setMessages(messages);
      }

      // Fetch notes
      const notesResponse = await fetch(`http://localhost:3000/notes/${roomId}`);
      if (notesResponse.ok) {
        const notes = await notesResponse.json();
        console.log('Fetched notes:', notes.length);
        setNotes(notes);
      }

      // Fetch files
      const filesResponse = await fetch(`http://localhost:3000/files/${roomId}`);
      if (filesResponse.ok) {
        const files = await filesResponse.json();
        console.log('Fetched files:', files.length);
        setFiles(files);
      }

      // Fetch branches if repository is linked (commits will be fetched after branch selection)
      if (roomData && roomData.githubRepo) {
        console.log('Room has GitHub repo:', roomData.githubRepo);
        await fetchBranches(roomData.githubRepo);
      } else {
        console.log('No GitHub repo linked to this room');
      }

      setDataLoaded(true);
    } catch (error) {
      console.error('Error fetching room data:', error);
    }
  };

  const addMessageWithFilter = (newMsg, currentMessages) => {

    if (newMsg.username !== 'System') {
      return [...currentMessages, newMsg];
    }
    const lastMsg = currentMessages[currentMessages.length - 1];
    if (lastMsg && lastMsg.username === 'System') {
      const isRedundantJoin = 
        newMsg.message.includes('has joined') && 
        lastMsg.message.includes('has joined') &&
        newMsg.message.split(' ')[0] === lastMsg.message.split(' ')[0];
      
      const isRedundantLeave = 
        newMsg.message.includes('has left') && 
        lastMsg.message.includes('has left') &&
        newMsg.message.split(' ')[0] === lastMsg.message.split(' ')[0];

      if (isRedundantJoin || isRedundantLeave) {
        // replace the last message instead of adding a new one, current error with double messaging
        return [...currentMessages.slice(0, -1), newMsg];
      }
    }

    return [...currentMessages, newMsg];
  };

  const playNotificationSound = () => {
    try {
      const audio = new Audio();
      audio.src = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
      audio.play();
    } catch (error) {
      console.log('Audio play failed:', error);
    }
  };

  // Fetch data immediately when component mounts
  useEffect(() => {
    fetchRoomData();
  }, [roomId]);

  useEffect(() => {
    // check username and roomid in localStorage
    const storedUsername = localStorage.getItem('username');
    const storedRoomId = localStorage.getItem('roomId');

    if (!storedUsername || !storedRoomId || storedRoomId !== roomId) {
      navigate('/');
      return;
    }

    const joinRoom = async () => {
      if (hasJoined) {
        console.log('Already joined room, skipping...');
        return;
      }

      const roomExists = await checkRoomExists();
      
      if (!roomExists) {
        setShowRoomAlert(true);
        return;
      }

      setUsername(storedUsername);
      setHasJoined(true);
     
      socket.on('room:joined', ({ isNewRoom: newRoom }) => {
        console.log('Room joined event received:', { isNewRoom: newRoom });
        setIsNewRoom(newRoom);
        if (newRoom) {
          alert('Welcome! You are the first person to join this room.');
        }
        // Don't save to history here - it will be saved when joining via password
        // saveRoomToHistory(roomId);
      });

      socket.on('joinRoom:error', (error) => {
        console.error('Join room error:', error);
        alert('Failed to join room. Please try again.');
        navigate('/');
      });

      console.log('Socket event listeners set up for room:', roomId);

      socket.on('message', (msg) => {
        setMessages(prev => addMessageWithFilter(msg, prev));
      });

      socket.on('message:history', (history) => {
        console.log('Received message history:', history);
        const filteredHistory = history.reduce((acc, msg) => {
          return addMessageWithFilter(msg, acc);
        }, []);
        setMessages(filteredHistory);
      });

      socket.on('message:error', (error) => {
        console.error('Message error:', error);
      });

      socket.on('notes:history', (history) => {
        console.log('Received notes history:', history);
        setNotes(history);
      });

      socket.on('note:added', (note) => {
        setNotes(prev => [note, ...prev]);
      });

      socket.on('note:deleted', ({ noteId }) => {
        setNotes(prev => prev.filter(note => note._id !== noteId));
      });

      socket.on('note:error', (error) => {
        console.error('Note error:', error);
      });

      socket.on('files:list', (filesList) => {
        console.log('Received files list:', filesList);
        setFiles(filesList);
      });

      socket.on('file:uploaded', (newFile) => {
        setFiles(prev => [newFile, ...prev]);
      });

      socket.on('file:deleted', ({ fileId }) => {
        setFiles(prev => prev.filter(file => file._id !== fileId));
      });

      socket.on('timer:update', (updatedTimer) => {
        if (updatedTimer && typeof updatedTimer.remainingTime === 'number') {
          setTime(updatedTimer.remainingTime);
          setTimerStatus(updatedTimer.status || 'paused');
          setTimerLastUpdateBy(updatedTimer.lastUpdateBy || '');
          if (updatedTimer.status === 'ended') {
            // Check if alert was already shown for this timer session
            const alertAlreadyShown = localStorage.getItem(`timerAlertShown_${roomId}`) === 'true';
            if (!alertAlreadyShown) {
              setShowTimerEndAlert(true);
              setTimerAlertShown(true);
              localStorage.setItem(`timerAlertShown_${roomId}`, 'true');
              playNotificationSound();
            }
          }
        }
      });

   
      console.log('Emitting joinRoom:', { roomId, username: storedUsername });
      socket.emit('joinRoom', {
        roomId,
        username: storedUsername
      });
    };

    joinRoom();

    // Clean up socket listeners
    return () => {
      console.log('Cleaning up socket listeners');
      setHasJoined(false);
      // Don't reset timerAlertShown here as it should persist across room changes
      socket.off('room:joined');
      socket.off('joinRoom:error');
      socket.off('message');
      socket.off('message:history');
      socket.off('message:error');
      socket.off('timer:update');
      socket.off('notes:history');
      socket.off('note:added');
      socket.off('note:deleted');
      socket.off('note:error');
      socket.off('files:list');
      socket.off('file:uploaded');
      socket.off('file:deleted');
      socket.emit('leaveRoom', { roomId, username: storedUsername });
    };
  }, [roomId, navigate]);

  const handleSetTime = () => {
    const totalSeconds = 
      (parseInt(hours) || 0) * 3600 + 
      (parseInt(minutes) || 0) * 60 + 
      (parseInt(seconds) || 0);
    
    if (totalSeconds <= 0) {
      alert('Please enter a valid time greater than 0');
      return;
    }
    
    socket.emit('timer:set', { roomId, totalSeconds });
    setShowTimerEndAlert(false);
    setTimerAlertShown(false);
    localStorage.removeItem(`timerAlertShown_${roomId}`);
  };

  const startTimer = () => {
    socket.emit('timer:start', { roomId });
  };

  const resetTimer = () => {
    socket.emit('timer:reset', { roomId });
    setTimerAlertShown(false);
    localStorage.removeItem(`timerAlertShown_${roomId}`);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      console.log('Sending message:', {
        roomId,
        message: message.trim(),
        username
      });
      socket.emit('message', {
        roomId,
        message: message.trim(),
        username
      });
      setMessage('');
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };



  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatCommitDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const handleBranchChange = async (newBranch) => {
    setSelectedBranch(newBranch);
    if (roomInfo?.githubRepo) {
      await fetchCommits(roomInfo.githubRepo, newBranch);
    }
  };

  const handleAddNote = (e) => {
    e.preventDefault();
    if (newNote.trim()) {
      socket.emit('note:add', {
        roomId,
        username,
        content: newNote.trim()
      });
      setNewNote('');
    }
  };

  const handleDeleteNote = (noteId) => {
    socket.emit('note:delete', {
      roomId,
      noteId,
      username
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const fetchBranches = async (repoUrl) => {
    try {
      setLoadingBranches(true);
      const token = localStorage.getItem('authToken');
      const encodedUrl = encodeURIComponent(repoUrl);
      
      console.log('Fetching branches for URL:', repoUrl);
      console.log('Encoded URL:', encodedUrl);
      
      const response = await fetch(`http://localhost:3000/github/branches/${encodedUrl}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Branches response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Branches data:', data);
        setBranches(data.branches || []);
        // Set the first branch as selected if we have branches
        if (data.branches && data.branches.length > 0) {
          const firstBranch = data.branches[0].name;
          setSelectedBranch(firstBranch);
          console.log('Selected branch:', firstBranch);
          // Fetch commits for the selected branch immediately
          await fetchCommits(repoUrl, firstBranch);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        console.error('Failed to fetch branches:', errorData);
        setBranches([]);
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      setBranches([]);
    } finally {
      setLoadingBranches(false);
    }
  };

  const fetchCommits = async (repoUrl, branch = null) => {
    try {
      setLoadingCommits(true);
      const token = localStorage.getItem('authToken');
      const encodedUrl = encodeURIComponent(repoUrl);
      const branchParam = branch || selectedBranch;
      
      console.log('Fetching commits for URL:', repoUrl);
      console.log('Branch:', branchParam);
      console.log('Encoded URL:', encodedUrl);
      
      const response = await fetch(`http://localhost:3000/github/commits/${encodedUrl}/${branchParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Commits response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Commits data:', data);
        setCommits(data.commits || []);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        console.error('Failed to fetch commits:', errorData);
        
        // If it's a 404 and we're trying the default branch, try the first available branch
        if (response.status === 404 && branchParam === 'main' && branches.length > 0) {
          console.log('Branch "main" not found, trying first available branch:', branches[0].name);
          await fetchCommits(repoUrl, branches[0].name);
          return;
        }
        
        setCommits([]);
      }
    } catch (error) {
      console.error('Error fetching commits:', error);
      setCommits([]);
    } finally {
      setLoadingCommits(false);
    }
  };

  const handleFileDownload = async (fileId, originalName) => {
    try {
      // file download URL
      const urlResponse = await fetch(`http://localhost:3000/file/url/${fileId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Room-ID': roomId,
          'X-Username': username
        }
      });

      if (!urlResponse.ok) {
        const errorData = await urlResponse.json().catch(() => ({
          error: urlResponse.status === 404 ? 'File not found' :
                 urlResponse.status === 403 ? 'You do not have permission to download this file' :
                 'Failed to get download URL'
        }));
        throw new Error(errorData.error);
      }

      const { downloadUrl } = await urlResponse.json();
      
      // downloading 
      const downloadResponse = await fetch(`http://localhost:3000${downloadUrl}`, {
        method: 'GET',
        headers: {
          'X-Room-ID': roomId,
          'X-Username': username
        }
      });

      if (!downloadResponse.ok) {
        const errorData = await downloadResponse.json().catch(() => ({
          error: downloadResponse.status === 404 ? 'File not found' :
                 downloadResponse.status === 403 ? 'You do not have permission to download this file' :
                 'Failed to download file'
        }));
        throw new Error(errorData.error);
      }

      
      const contentLength = downloadResponse.headers.get('Content-Length');
      const total = parseInt(contentLength, 10);
      
      const reader = downloadResponse.body.getReader();
      const chunks = [];
      let receivedLength = 0;

      while(true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        receivedLength += value.length;
        
        if (total) {
          const progress = (receivedLength / total) * 100;
          setUploadProgress(progress); 
        }
      }

      const chunksAll = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) {
        chunksAll.set(chunk, position);
        position += chunk.length;
      }

      const blob = new Blob([chunksAll], { 
        type: downloadResponse.headers.get('Content-Type') || 'application/octet-stream' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = originalName;
      document.body.appendChild(link);
      link.click();

      setUploadProgress(null);

      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);

    } catch (error) {
      console.error('Download error:', error);
      setUploadProgress(null);
      alert(error.message || 'Failed to download file');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const maxSize = 50 * 1024 * 1024; 
    if (file.size > maxSize) {
      alert('File size must be less than 50MB');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('roomId', roomId);
    formData.append('username', username);

    try {
      setUploadProgress(0);
      console.log('Starting upload:', { 
        fileName: file.name,
        fileSize: file.size,
        roomId,
        username 
      });

      const response = await fetch('http://localhost:3000/upload', {
        method: 'POST',
        headers: {
          'X-Room-ID': roomId,
          'X-Username': username
        },
        body: formData
      });

      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || 'Upload failed';
        } catch {
          errorMessage = 'Failed to upload file';
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Server response structure:', {
        resultType: typeof result,
        hasFileId: 'fileId' in result,
        has_id: '_id' in result,
        keys: Object.keys(result),
        fullResult: result
      });

      const newFile = {
        _id: result.fileId || result._id, 
        originalName: result.originalName || file.name,
        filename: result.filename,
        size: result.size || file.size,
        uploadedBy: result.uploadedBy || username,
        uploadDate: result.uploadDate || new Date().toISOString(),
        mimetype: result.mimetype || file.type,
        downloadUrl: result.downloadUrl 
      };

      setUploadProgress(100);
   
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setTimeout(() => setUploadProgress(null), 1000);

      socket.emit('file:uploaded', {
        fileId: newFile._id,
        roomId,
        username
      });

      alert('File uploaded successfully!');

    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress(null);
 
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      alert(error.message);
    }
  };

  const handleFileDelete = async (fileId) => {
    if (!fileId) {
      alert('Invalid file ID');
      return;
    }
    try {
      console.log('Attempting to delete file:', fileId, 'by user:', username);
      
      const response = await fetch(`http://localhost:3000/file/${fileId}?username=${encodeURIComponent(username)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Room-ID': roomId,
          'X-Username': username
        }
      });

      console.log('Delete response status:', response.status);

      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          console.log('Error response data:', errorData);
          errorMessage = errorData.error;
        } catch (jsonError) {
          console.log('Error parsing JSON response:', jsonError);
          errorMessage = response.status === 404 ? 'File not found' :
                        response.status === 403 ? 'You can only delete files you uploaded' :
                        response.status === 500 ? 'Server error while deleting file' :
                        'Failed to delete file';
        }
        throw new Error(errorMessage);
      }

      console.log('File deleted successfully');
  
      setFiles(prev => prev.filter(file => file._id !== fileId));
      
      socket.emit('file:deleted', {
        fileId,
        roomId,
        username
      });

    } catch (error) {
      console.error('Delete error:', error);
      alert(error.message);
    }
  };

  useEffect(() => {
    socket.on('upload:progress', (progress) => {
      setUploadProgress(progress);
    });

    return () => {
      socket.off('upload:progress');
    };
  }, []);

  useEffect(() => {
    socket.on('files:update', (updatedFiles) => {
      setFiles(updatedFiles);
    });

    return () => {
      socket.off('files:update');
    };
  }, []);

 
  const RoomAlert = () => (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black opacity-50"></div>
      <div className="bg-white rounded-lg p-8 z-10 shadow-xl max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Room Not Found</h2>
        <p className="text-gray-700 mb-6">
          This room doesn't exist. Would you like to create a new room with this ID or go back to enter a different room ID?
        </p>
        <div className="flex justify-end space-x-4">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Go Back
          </button>
          <button
            onClick={() => {
              setShowRoomAlert(false);
              setUsername(localStorage.getItem('username'));
              socket.emit('joinRoom', {
                roomId,
                username: localStorage.getItem('username')
              });
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Create Room
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      {showRoomAlert && <RoomAlert />}
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold">Room: {roomId}</h1>
            <span className="text-gray-600">Joined as: {username}</span>
            {roomInfo?.githubRepo && (
              <div className="text-sm text-gray-500 mt-1">
                Repository: {roomInfo.githubRepo.split('/').slice(-2).join('/')}
              </div>
            )}
          </div>
        </div>
        
        {/* Timer End Alert */}
        {showTimerEndAlert && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="absolute inset-0 bg-black opacity-50"></div>
            <div className="bg-white rounded-lg p-8 z-10 shadow-xl">
              <h2 className="text-2xl font-bold text-red-600 mb-4">Time's Up!</h2>
              <p className="text-gray-700 mb-4">The timer has ended.</p>
              <button
                onClick={() => {
                  setShowTimerEndAlert(false);
                  setTimerAlertShown(true);
                  localStorage.setItem(`timerAlertShown_${roomId}`, 'true');
                }}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Close
              </button>
            </div>
          </div>
        )}
        
        {/* Timer and Commits Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-bold">Timer</h2>
            {roomInfo?.githubRepo && (
              <a
                href={roomInfo.githubRepo}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-lg transition duration-300"
                title="View GitHub Repository"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span className="text-sm font-medium">Repository</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                </svg>
              </a>
            )}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timer Section */}
            <div className="lg:col-span-1">
              <div className="flex flex-col items-center">
                <div className="text-4xl font-mono text-center mb-2">
                  {formatTime(time)}
                </div>
                <span className={`text-sm font-semibold px-2 py-1 rounded mb-2 ${
                  time === 0
                    ? 'bg-red-100 text-red-700'
                    : timerStatus === 'running'
                    ? 'bg-green-100 text-green-700'
                    : timerStatus === 'paused'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {time === 0 ? 'Ended' : timerStatus.charAt(0).toUpperCase() + timerStatus.slice(1)}
                </span>
                
                <div className="flex justify-center space-x-2 mb-4 w-full">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Hours</label>
                    <input
                      type="number"
                      min="0"
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      className="w-16 px-2 py-1 border rounded text-center"
                      placeholder="0"
                      aria-label="Hours"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Minutes</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={minutes}
                      onChange={(e) => setMinutes(e.target.value)}
                      className="w-16 px-2 py-1 border rounded text-center"
                      placeholder="0"
                      aria-label="Minutes"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Seconds</label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={seconds}
                      onChange={(e) => setSeconds(e.target.value)}
                      className="w-16 px-2 py-1 border rounded text-center"
                      placeholder="0"
                      aria-label="Seconds"
                    />
                  </div>
                </div>
                <div className="flex justify-center space-x-2 w-full">
                  <button
                    onClick={handleSetTime}
                    className="bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
                    disabled={timerStatus === 'running'}
                    title="Set timer duration"
                  >
                    Set Time
                  </button>
                  {timerStatus === 'running' ? (
                    <button
                      onClick={resetTimer}
                      className="bg-red-500 text-white px-3 py-1.5 rounded hover:bg-red-600 disabled:opacity-50 text-sm"
                      disabled={time === 0}
                      title="Reset the timer"
                    >
                      Reset
                    </button>
                  ) : (
                    <button
                      onClick={startTimer}
                      className="bg-green-500 text-white px-3 py-1.5 rounded hover:bg-green-600 disabled:opacity-50 text-sm"
                      title="Start the timer"
                    >
                      Start
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Commits Section */}
            <div className="lg:col-span-2">
              <div className="bg-gray-50 rounded-lg p-4 h-full">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-800">Latest Commits</h3>
                  <div className="flex items-center space-x-2">
                    {roomInfo?.githubRepo && branches.length > 0 && (
                      <select
                        value={selectedBranch}
                        onChange={(e) => handleBranchChange(e.target.value)}
                        disabled={loadingBranches}
                        className="text-sm border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {loadingBranches ? (
                          <option>Loading branches...</option>
                        ) : (
                          branches.map((branch) => (
                            <option key={branch.name} value={branch.name}>
                              {branch.name}
                            </option>
                          ))
                        )}
                      </select>
                    )}
                    {roomInfo?.githubRepo && (
                      <button
                        onClick={() => fetchCommits(roomInfo.githubRepo)}
                        disabled={loadingCommits}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50"
                      >
                        {loadingCommits ? 'Refreshing...' : 'Refresh'}
                      </button>
                    )}
                  </div>
                </div>
                
                {loadingCommits ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-gray-600">Loading commits...</span>
                  </div>
                ) : commits.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {commits.map((commit, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 border border-gray-200 hover:border-gray-300 transition-colors">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-1 rounded">
                                {commit.sha}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatCommitDate(commit.date)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-800 font-medium truncate">
                              {commit.message}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              by {commit.author}
                            </p>
                          </div>
                          <a
                            href={commit.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-blue-600 hover:text-blue-800"
                            title="View commit on GitHub"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                            </svg>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : roomInfo?.githubRepo && branches.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                    <p className="text-sm">No branches found</p>
                    <p className="text-xs text-gray-400 mt-1">Create a branch to see commits here</p>
                  </div>
                ) : roomInfo?.githubRepo ? (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <p className="text-sm">No commits found</p>
                    <p className="text-xs text-gray-400 mt-1">Make your first commit to see it here</p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"></path>
                    </svg>
                    <p className="text-sm">No repository linked</p>
                    <p className="text-xs text-gray-400 mt-1">Link a repository to see commits here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Messages Section */}
          <div className="col-span-1 bg-white rounded-lg shadow-md p-4 flex flex-col h-[500px]">
            <h2 className="text-xl font-semibold mb-2">Chat</h2>
            {/* Messages container */}
            <div className="flex-1 overflow-y-auto mb-2 border rounded-lg bg-gray-50 p-2">
              {messages.map((msg, index) => (
                <div key={index} className={`mb-1 ${msg.username === 'System' ? 'text-center' : ''}`}>
                  {msg.username === 'System' ? (
                    <div className="text-xs text-gray-500 italic">
                      {msg.message}
                      {msg.timestamp && (
                        <span className="ml-2">
                          {formatTimestamp(msg.timestamp)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-baseline space-x-2">
                      <span className="font-semibold text-blue-600">{msg.username}:</span>
                      <span className="text-gray-800">{msg.message}</span>
                      {msg.timestamp && (
                        <span className="text-xs text-gray-500 ml-2">
                          {formatTimestamp(msg.timestamp)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* Message input form */}
            <form onSubmit={sendMessage} className="flex gap-2 pt-1">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 p-1.5 border rounded text-sm"
              />
              <button
                type="submit"
                className="bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600 text-sm flex-shrink-0"
              >
                Send
              </button>
            </form>
          </div>

          {/* Notes Section */}
          <div className="col-span-1 bg-white rounded-lg shadow-md p-4 flex flex-col h-[500px]">
            <h2 className="text-xl font-semibold mb-2">Notes</h2>
            <form onSubmit={handleAddNote} className="mb-2">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Write a note..."
                className="w-full p-2 border rounded mb-2 h-20 resize-none text-sm"
              />
              <button
                type="submit"
                className="w-full bg-green-500 text-white px-4 py-1.5 rounded hover:bg-green-600 text-sm"
              >
                Add Note
              </button>
            </form>
            <div className="flex-1 overflow-y-auto border rounded-lg bg-gray-50 p-2">
              {notes.map((note) => (
                <div key={note._id} className="bg-white rounded p-2 relative group mb-2">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-semibold text-blue-600 text-sm">{note.username}</span>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(note.timestamp)}
                    </span>
                  </div>
                  <p className="text-gray-800 whitespace-pre-wrap text-sm">{note.content}</p>
                  {note.username === username && (
                    <button
                      onClick={() => handleDeleteNote(note._id)}
                      className="absolute top-1 right-1 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Files Section */}
          <div className="col-span-1 bg-white rounded-lg shadow-md p-4 flex flex-col h-[500px]">
            <h2 className="text-xl font-semibold mb-2">Files</h2>
            <div className="mb-2">
              <label className="block w-full">
                <span className="sr-only">Choose file</span>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-1.5 file:px-3
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
              </label>
              {uploadProgress !== null && (
                <div className="mt-2">
                  <div className="h-1.5 bg-blue-200 rounded">
                    <div
                      className="h-1.5 bg-blue-600 rounded"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto border rounded-lg bg-gray-50 p-2">
              {files.map((file) => (
                <div key={`file-${file._id || file.id}`} className="bg-white rounded p-2 relative group mb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 mr-4">
                      <div className="font-medium text-blue-600 truncate text-sm">
                        {file.originalName}
                      </div>
                      <div className="text-xs text-gray-500">
                        Uploaded by {file.uploadedBy} • {formatFileSize(file.size)} • {formatTimestamp(file.uploadDate)}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {/* Primary download button */}
                      <button
                        onClick={() => handleFileDownload(file._id, file.originalName)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Download"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                      {/* Fallback direct download link if URL is available */}
                      {file.downloadUrl && (
                        <a
                          href={file.downloadUrl}
                          download={file.originalName}
                          className="text-green-600 hover:text-green-800 ml-2"
                          title="Direct Download"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" />
                          </svg>
                        </a>
                      )}
                      {file.uploadedBy === username && (
                        <button
                          onClick={() => {
                            if (!file._id && !file.id) {
                              alert('Invalid file ID');
                              return;
                            }
                            handleFileDelete(file._id || file.id);
                          }}
                          className="text-red-600 hover:text-red-800"
                          title="Delete"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Room; 