import Message from '../models/Message.js';
import File from '../models/File.js';
import Timer from '../models/Timer.js';
import Note from '../models/Note.js';
import Room from '../models/Room.js';
import { rooms } from '../utils/roomStore.js';

export const checkRoomExists = async (req, res) => {
  try {
    const { roomId } = req.params;

    // Check if room exists in database
    const room = await Room.findOne({ roomId });
    if (room) {
      return res.json({ exists: true, hasPassword: true });
    }

    // Fallback to old method for backward compatibility
    const [hasMessages, hasFiles, hasTimer, hasNotes] = await Promise.all([
      Message.exists({ roomId }),
      File.exists({ roomId }),
      Timer.exists({ roomId }),
      Note.exists({ roomId })
    ]);

    const roomExists = hasMessages || hasFiles || hasTimer || hasNotes || rooms.has(roomId);
    res.json({ exists: roomExists, hasPassword: false });
  } catch (err) {
    console.error('Room check error:', err);
    res.status(500).json({ error: 'Error checking room existence' });
  }
};

export const createRoom = async (req, res) => {
  try {
    console.log('Create room request received:', req.body);
    const { roomId, password, createdBy, githubRepo } = req.body;

    if (!roomId || !password || !createdBy) {
      console.log('Missing required fields:', { roomId: !!roomId, password: !!password, createdBy: !!createdBy });
      return res.status(400).json({ error: 'Room ID, password, and creator are required' });
    }

    // Check if room already exists
    const existingRoom = await Room.findOne({ roomId });
    if (existingRoom) {
      console.log('Room already exists:', roomId);
      return res.status(409).json({ error: 'Room already exists' });
    }

    console.log('Creating new room:', { roomId, createdBy, githubRepo });
    
    // Create new room
    const room = new Room({
      roomId,
      password,
      createdBy,
      githubRepo: githubRepo || null
    });

    await room.save();
    console.log(`Room created successfully: ${roomId} by ${createdBy}`);

    res.json({ 
      success: true, 
      roomId, 
      message: 'Room created successfully' 
    });
  } catch (err) {
    console.error('Room creation error:', err);
    console.error('Error details:', err.message);
    res.status(500).json({ error: 'Error creating room: ' + err.message });
  }
};

export const joinRoom = async (req, res) => {
  try {
    const { roomId, password, userId } = req.body;

    if (!roomId || !password) {
      return res.status(400).json({ error: 'Room ID and password are required' });
    }

    // Check if room exists and password matches
    const room = await Room.findOne({ roomId });
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Skip password check if this is a history save (dummy password)
    if (password !== 'history-save' && room.password !== password) {
      console.log('Password mismatch:', { provided: password, expected: room.password });
      return res.status(401).json({ error: 'Incorrect password' });
    }

    // Update last activity (only if not a history save)
    if (password !== 'history-save') {
      room.lastActivity = new Date();
      await room.save();
    }

    // Add room to user's history if userId is provided
    if (userId) {
      console.log('Adding room to user history:', { roomId, userId });
      try {
        const User = (await import('../models/User.js')).default;
        const user = await User.findById(userId);
        if (user) {
          console.log('Found user:', user.username);
          // Check if room already exists in user's history
          const existingRoom = user.joinedRooms.find(r => r.roomId === roomId);
          if (existingRoom) {
            // Update last visited time
            existingRoom.lastVisited = new Date();
            console.log('Updated existing room in history');
          } else {
            // Add new room to history
            user.joinedRooms.push({
              roomId,
              joinedAt: new Date(),
              lastVisited: new Date()
            });
            console.log('Added new room to history');
          }
          await user.save();
          console.log(`Added room ${roomId} to user ${userId}'s history`);
        } else {
          console.log('User not found:', userId);
        }
      } catch (userError) {
        console.error('Error updating user room history:', userError);
        // Don't fail the join request if user history update fails
      }
    } else {
      console.log('No userId provided, skipping history update');
    }

    console.log(`User joined room: ${roomId}`);

    res.json({ 
      success: true, 
      roomId, 
      message: 'Successfully joined room' 
    });
  } catch (err) {
    console.error('Room join error:', err);
    res.status(500).json({ error: 'Error joining room' });
  }
};
