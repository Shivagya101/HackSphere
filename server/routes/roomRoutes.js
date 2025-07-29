import express from 'express';
import { checkRoomExists, createRoom, joinRoom } from '../controllers/roomController.js';
import Message from '../models/Message.js';
import Note from '../models/Note.js';
import File from '../models/File.js';

console.log('Room routes file loaded, functions available:', { checkRoomExists: !!checkRoomExists, createRoom: !!createRoom, joinRoom: !!joinRoom });

const router = express.Router();

router.get('/room/:roomId/exists', checkRoomExists);
router.post('/room/create', createRoom);
router.post('/room/join', joinRoom);

// Direct data fetching endpoints
router.get('/messages/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const messages = await Message.find({ roomId }).sort({ timestamp: 1 }).limit(100);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

router.get('/notes/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const notes = await Note.find({ roomId }).sort({ timestamp: -1 });
    res.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

router.get('/files/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const files = await File.find({ roomId }).sort({ uploadDate: -1 });
    res.json(files);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Test route to verify router is working
router.get('/room/test', (req, res) => {
  res.json({ message: 'Room routes are working!' });
});

// Test DELETE route
router.delete('/room/test-delete', (req, res) => {
  res.json({ message: 'DELETE method is working!' });
});

// Get user's room history (moved from auth routes)
router.get('/user/:userId/rooms', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('Fetching room history for user:', userId);
    
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(userId);
    
    if (!user) {
      console.log('User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('Found user:', user.username, 'with rooms:', user.joinedRooms?.length || 0);
    
    res.json({ 
      rooms: user.joinedRooms || [],
      message: 'Room history retrieved successfully' 
    });
  } catch (error) {
    console.error('Error fetching room history:', error);
    res.status(500).json({ error: 'Failed to fetch room history' });
  }
});

// Delete room from user's history
router.delete('/user/:userId/rooms/:roomId', async (req, res) => {
  console.log('DELETE endpoint hit:', req.params);
  try {
    const { userId, roomId } = req.params;
    console.log('Deleting room from history:', { userId, roomId });
    
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(userId);
    
    if (!user) {
      console.log('User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove the room from joinedRooms array
    const initialLength = user.joinedRooms.length;
    user.joinedRooms = user.joinedRooms.filter(room => room.roomId !== roomId);
    const finalLength = user.joinedRooms.length;
    
    if (initialLength === finalLength) {
      console.log('Room not found in user history:', roomId);
      return res.status(404).json({ error: 'Room not found in history' });
    }

    await user.save();
    console.log('Room deleted from history:', roomId);

    res.json({ 
      success: true,
      message: 'Room removed from history successfully',
      remainingRooms: user.joinedRooms.length
    });
  } catch (error) {
    console.error('Error deleting room from history:', error);
    res.status(500).json({ error: 'Failed to delete room from history' });
  }
});

export default router;
