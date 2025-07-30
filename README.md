# HackSphere - Collaborative Hackathon Timer

A real-time collaborative timer and workspace for hackathon teams with GitHub repository integration.

## Features

- **Real-time Timer**: Collaborative countdown timer with start, pause, and reset functionality
- **Team Chat**: Real-time messaging system for team communication
- **Notes**: Shared notes for team collaboration
- **File Sharing**: Upload and share files with team members
- **GitHub Integration**: Link your project repository during room creation
- **Room Management**: Create password-protected rooms and join existing ones
- **User Authentication**: Secure GitHub OAuth authentication

## New Feature: GitHub Repository Integration

### What's New
- **Repository Selection**: When creating a room, users can now link a GitHub repository
- **Two Options**:
  - Select from existing repositories (requires GitHub API setup)
  - Enter a custom repository URL
- **Visual Integration**: Repository link appears next to the timer in the main room
- **Optional Feature**: Users can skip repository selection if not needed

### How It Works
1. **Room Creation Flow**:
   - Create room → Set password → Choose repository → Room created
2. **Repository Options**:
   - **Select Existing**: Choose from your GitHub repositories
   - **Enter URL**: Manually enter any GitHub repository URL
   - **Skip**: Create room without linking a repository
3. **Room Display**: Repository link appears in the top-right of the timer section

## Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB
- GitHub account (for OAuth and repository access)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd HackSphere
   ```

2. **Install dependencies**
   ```bash
   # Install server dependencies
   cd server
   npm install
   
   # Install client dependencies
   cd ../client
   npm install
   ```

3. **Environment Setup**
   
   Create a `.env` file in the `server` directory. See `server/ENVIRONMENT_SETUP.md` for detailed instructions.
   
   Required variables:
   ```env
   GITHUB_CLIENT_ID=your_github_client_id
   GITHUB_CLIENT_SECRET=your_github_client_secret
   GITHUB_ACCESS_TOKEN=your_github_personal_access_token
   JWT_SECRET=your_jwt_secret
   MONGODB_URI=mongodb://localhost:27017/hacksphere
   PORT=3000
   ```

4. **Start the application**
   ```bash
   # Start the server (from server directory)
   npm run dev
   
   # Start the client (from client directory)
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000

## Usage

1. **Authentication**: Sign in with your GitHub account
2. **Create Room**: Generate a new room with password protection
3. **Repository Setup**: Choose to link a GitHub repository or skip
4. **Collaborate**: Use the timer, chat, notes, and file sharing features
5. **Repository Access**: Click the repository link next to the timer to view your project

## Technology Stack

- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: Node.js, Express, Socket.io
- **Database**: MongoDB
- **Authentication**: GitHub OAuth, JWT
- **Real-time**: Socket.io
- **File Storage**: GridFS

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License. 