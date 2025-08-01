# Backend Environment Setup

## Environment Variables

The backend now uses environment variables for configuration. Create a `.env` file in the `server` directory with the following variables:

```env
# Database Configuration
MONGO_URI=your_mongodb_connection_string

# JWT Configuration
JWT_SECRET=your_jwt_secret_key

# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_ACCESS_TOKEN=your_github_access_token

# Server Configuration
PORT=3000
BACKEND_URL=http://localhost:3000

# Frontend Configuration
FRONTEND_URL=http://localhost:5173
```

## Configuration Details

### Database

- `MONGO_URI`: Your MongoDB connection string (already configured)

### Authentication

- `JWT_SECRET`: Secret key for JWT token signing
- `GITHUB_CLIENT_ID`: GitHub OAuth app client ID
- `GITHUB_CLIENT_SECRET`: GitHub OAuth app client secret
- `GITHUB_ACCESS_TOKEN`: GitHub personal access token for API calls

### Server Configuration

- `PORT`: Server port (default: 3000)
- `BACKEND_URL`: Your backend server URL (used for GitHub OAuth callback)

### Frontend Configuration

- `FRONTEND_URL`: Your frontend application URL (used for redirects and CORS)

## What Was Fixed

The following hardcoded localhost URLs have been replaced with environment variables:

1. **`server/routes/authRoutes.js`**:

   - Authentication redirects now use `FRONTEND_URL`

2. **`server/index.js`**:

   - CORS configuration now uses `FRONTEND_URL`
   - Socket.IO CORS now uses `FRONTEND_URL`

3. **`server/config/passport.js`**:
   - GitHub OAuth callback URL now uses `BACKEND_URL`

## Development vs Production

**Development:**

```env
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
```

**Production:**

```env
BACKEND_URL=https://your-backend-domain.com
FRONTEND_URL=https://your-frontend-domain.com
```

## Files Updated

- `server/routes/authRoutes.js` - Updated to use `FRONTEND_URL`
- `server/index.js` - Updated to use `FRONTEND_URL` for CORS
- `server/config/passport.js` - Updated to use `BACKEND_URL` for OAuth callback
