# Frontend Environment Setup

## Environment Variables

The frontend now uses environment variables for backend configuration. Create a `.env` file in the `client` directory with the following variables:

```env
# Backend URL configuration
# Replace with your actual backend URL (e.g., http://localhost:3000 for development)
VITE_BACKEND_URL=http://localhost:3000

# Socket URL configuration (usually same as backend URL)
VITE_SOCKET_URL=http://localhost:3000
```

## Configuration

The frontend uses the following environment variables:

- `VITE_BACKEND_URL`: The URL of your backend server
- `VITE_SOCKET_URL`: The URL for WebSocket connections (usually same as backend URL)

## Usage

The environment variables are imported in `src/config.js` and used throughout the application:

- All API calls now use `${BACKEND_URL}` instead of hardcoded localhost URLs
- Socket connections use `${SOCKET_URL}` instead of hardcoded localhost URLs

## Development vs Production

- **Development**: Use `http://localhost:3000` for both variables
- **Production**: Use your actual backend domain (e.g., `https://your-backend.com`)

## Files Updated

The following files have been updated to use environment variables:

- `src/config.js` - New configuration file
- `src/socket.js` - Updated to use `SOCKET_URL`
- `src/components/Login.jsx` - Updated to use `BACKEND_URL`
- `src/components/layout/Navbar.jsx` - Updated to use `BACKEND_URL`
- `src/components/Home.jsx` - Updated to use `BACKEND_URL`
- `src/components/RoomHistory.jsx` - Updated to use `BACKEND_URL`
- `src/components/Room.jsx` - Updated to use `BACKEND_URL`
