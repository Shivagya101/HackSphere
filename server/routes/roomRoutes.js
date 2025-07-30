import express from 'express';
import { checkRoomExists, createRoom, joinRoom } from '../controllers/roomController.js';
import Message from '../models/Message.js';
import Note from '../models/Note.js';
import File from '../models/File.js';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

console.log('Room routes file loaded, functions available:', { checkRoomExists: !!checkRoomExists, createRoom: !!createRoom, joinRoom: !!joinRoom });

const router = express.Router();

router.get('/room/:roomId/exists', checkRoomExists);
router.get('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const Room = (await import('../models/Room.js')).default;
    const room = await Room.findOne({ roomId });
    
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    res.json({
      roomId: room.roomId,
      createdBy: room.createdBy,
      githubRepo: room.githubRepo,
      createdAt: room.createdAt,
      lastActivity: room.lastActivity
    });
  } catch (error) {
    console.error('Error fetching room info:', error);
    res.status(500).json({ error: 'Failed to fetch room information' });
  }
});
router.post('/room/create', createRoom);
router.post('/room/join', joinRoom);

// Test GitHub API connection
router.get('/github/test', async (req, res) => {
  try {
    console.log('Testing GitHub API connection...');
    console.log('GITHUB_ACCESS_TOKEN exists:', !!process.env.GITHUB_ACCESS_TOKEN);
    
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${process.env.GITHUB_ACCESS_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    console.log('GitHub API test response status:', response.status);
    
    if (response.ok) {
      const userData = await response.json();
      res.json({ 
        success: true, 
        message: 'GitHub API connection successful',
        user: userData.login
      });
    } else {
      const errorText = await response.text();
      res.status(response.status).json({ 
        success: false, 
        error: `GitHub API error: ${response.status}`,
        details: errorText
      });
    }
  } catch (error) {
    console.error('GitHub API test error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to test GitHub API connection',
      details: error.message
    });
  }
});

// Get user's GitHub repositories
router.get('/github/repos', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // For now, we'll use a fallback approach since we don't store the access token
    // In a production app, you'd want to store the access token securely
    // and use it to fetch user-specific repositories
    
    // Fetch repositories from GitHub API using the global token
    // Note: This will fetch repos for the account associated with the global token
    const response = await fetch(`https://api.github.com/user/repos?sort=updated&per_page=100`, {
      headers: {
        'Authorization': `token ${process.env.GITHUB_ACCESS_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      // If the global token fails, return an error suggesting manual URL entry
      if (response.status === 401) {
        return res.status(400).json({ 
          error: 'GitHub access not configured. Please enter repository URL manually.',
          useCustomUrl: true
        });
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const repos = await response.json();
    const formattedRepos = repos.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      html_url: repo.html_url,
      description: repo.description,
      private: repo.private,
      updated_at: repo.updated_at
    }));

    res.json({ repos: formattedRepos });
  } catch (error) {
    console.error('Error fetching GitHub repos:', error);
    res.status(500).json({ 
      error: 'Failed to fetch GitHub repositories. Please enter repository URL manually.',
      useCustomUrl: true
    });
  }
});

  // Create a new GitHub repository
router.post('/github/create-repo', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { repoName, description, isPrivate } = req.body;

    if (!repoName || repoName.trim() === '') {
      return res.status(400).json({ error: 'Repository name is required' });
    }

    // Create repository using GitHub API
    const response = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Authorization': `token ${process.env.GITHUB_ACCESS_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: repoName.trim(),
        description: description || '',
        private: isPrivate || false,
        auto_init: true // Initialize with README
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 422) {
        return res.status(422).json({ 
          error: 'Repository name already exists or is invalid. Please choose a different name.',
          details: errorData.message
        });
      }
      throw new Error(`GitHub API error: ${response.status} - ${errorData.message}`);
    }

    const newRepo = await response.json();
    
    res.json({
      success: true,
      repository: {
        id: newRepo.id,
        name: newRepo.name,
        full_name: newRepo.full_name,
        html_url: newRepo.html_url,
        description: newRepo.description,
        private: newRepo.private
      }
    });
  } catch (error) {
    console.error('Error creating GitHub repo:', error);
    res.status(500).json({ 
      error: 'Failed to create GitHub repository. Please try again or use a manual URL.',
      useCustomUrl: true
    });
  }
});

// Get branches from a GitHub repository
router.get('/github/branches/:repoUrl', async (req, res) => {
  try {
    const { repoUrl } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Extract owner and repo from the URL
    const urlMatch = repoUrl.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!urlMatch) {
      return res.status(400).json({ error: 'Invalid GitHub repository URL' });
    }

    const [, owner, repo] = urlMatch;
    
    console.log('Fetching branches for:', { owner, repo });
    
    // Fetch branches from GitHub API
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches`, {
      headers: {
        'Authorization': `token ${process.env.GITHUB_ACCESS_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    console.log('GitHub API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API error response:', errorText);
      
      if (response.status === 404) {
        return res.status(404).json({ error: 'Repository not found or access denied' });
      }
      if (response.status === 401) {
        return res.status(401).json({ error: 'GitHub access token is invalid or expired' });
      }
      throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
    }

    const branches = await response.json();
    console.log('Fetched branches:', branches.length);
    
    const formattedBranches = branches.map(branch => ({
      name: branch.name,
      commit: {
        sha: branch.commit.sha.substring(0, 7),
        url: branch.commit.url
      }
    }));

    res.json({ branches: formattedBranches });
  } catch (error) {
    console.error('Error fetching GitHub branches:', error);
    res.status(500).json({ 
      error: 'Failed to fetch repository branches',
      branches: []
    });
  }
});

// Get latest commits from a specific branch in a GitHub repository
router.get('/github/commits/:repoUrl/:branch', async (req, res) => {
  try {
    const { repoUrl, branch } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Extract owner and repo from the URL
    const urlMatch = repoUrl.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!urlMatch) {
      return res.status(400).json({ error: 'Invalid GitHub repository URL' });
    }

    const [, owner, repo] = urlMatch;
    
    console.log('Fetching commits for:', { owner, repo, branch });
    
    // Fetch commits from specific branch
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}&per_page=5`, {
      headers: {
        'Authorization': `token ${process.env.GITHUB_ACCESS_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    console.log('GitHub API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API error response:', errorText);
      
      if (response.status === 404) {
        return res.status(404).json({ error: 'Repository or branch not found' });
      }
      if (response.status === 401) {
        return res.status(401).json({ error: 'GitHub access token is invalid or expired' });
      }
      throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
    }

    const commits = await response.json();
    console.log('Fetched commits:', commits.length);
    
    const formattedCommits = commits.map(commit => ({
      sha: commit.sha.substring(0, 7),
      message: commit.commit.message,
      author: commit.commit.author.name,
      date: commit.commit.author.date,
      url: commit.html_url
    }));

    res.json({ commits: formattedCommits });
  } catch (error) {
    console.error('Error fetching GitHub commits:', error);
    res.status(500).json({ 
      error: 'Failed to fetch repository commits',
      commits: []
    });
  }
});

// Get latest commits from a GitHub repository (default branch)
router.get('/github/commits/:repoUrl', async (req, res) => {
  try {
    const { repoUrl } = req.params;
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    // Extract owner and repo from the URL
    // Expected format: https://github.com/owner/repo
    const urlMatch = repoUrl.match(/https:\/\/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!urlMatch) {
      return res.status(400).json({ error: 'Invalid GitHub repository URL' });
    }

    const [, owner, repo] = urlMatch;
    
    // Fetch commits from GitHub API (default branch)
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`, {
      headers: {
        'Authorization': `token ${process.env.GITHUB_ACCESS_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ error: 'Repository not found or access denied' });
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const commits = await response.json();
    const formattedCommits = commits.map(commit => ({
      sha: commit.sha.substring(0, 7),
      message: commit.commit.message,
      author: commit.commit.author.name,
      date: commit.commit.author.date,
      url: commit.html_url
    }));

    res.json({ commits: formattedCommits });
  } catch (error) {
    console.error('Error fetching GitHub commits:', error);
    res.status(500).json({ 
      error: 'Failed to fetch repository commits',
      commits: []
    });
  }
});

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
