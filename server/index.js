import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import session from 'express-session';
import passport from 'passport';
import connectDB from './config/db.js';
import passportConfig from './config/passport.js';
import http from 'http';
import { Server } from 'socket.io';

dotenv.config();
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Session configuration
app.use(session({
  secret: process.env.JWT_SECRET || 'fallback_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Initialize passport config
passportConfig();

// Routes
console.log('Loading routes...');
import fileRoutes from './routes/fileRoutes.js';
app.use('/', fileRoutes);
console.log('File routes loaded');

import roomRoutes from './routes/roomRoutes.js';
app.use('/', roomRoutes);
console.log('Room routes loaded');

import authRoutes from './routes/authRoutes.js';
app.use('/', authRoutes);
console.log('Auth routes loaded');

// Debug: Log all registered routes
console.log('All routes registered successfully');

// Test if DELETE method works
app.delete('/test-delete', (req, res) => {
  console.log('Test DELETE endpoint hit');
  res.json({ message: 'DELETE method works!' });
});

app.get('/', (req, res) => {
  res.send('Hackathon backend is running!');
});

// Test route to verify server is working
app.get('/test', (req, res) => {
  res.json({ message: 'Server is working!', routes: ['/test', '/room/test', '/room/create'] });
});



// Create HTTP server and attach Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make io accessible in routes (like file upload notifications)
app.set('io', io);

// Import and initialize socket handlers
import initSocketHandlers from './socket/socketHandler.js';
initSocketHandlers(io);  // 👈 pass io to your handlers

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
