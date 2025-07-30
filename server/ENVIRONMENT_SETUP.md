# Environment Setup Guide

To enable the GitHub repository feature, you need to set up the following environment variables in your `server/.env` file:

## Required Environment Variables

### 1. GitHub OAuth Configuration
```
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
```

**How to get these:**
1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App
3. Set the Authorization callback URL to: `http://localhost:3000/auth/github/callback`
4. Copy the Client ID and Client Secret

### 2. GitHub Personal Access Token
```
GITHUB_ACCESS_TOKEN=your_github_personal_access_token_here
```

**How to get this:**
1. Go to GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)
2. Generate a new token with the following scopes:
   - `repo` (to access private repositories)
   - `user` (to access user information)
3. Copy the generated token

### 3. JWT Secret
```
JWT_SECRET=your_jwt_secret_here
```

**How to generate:**
- Use a secure random string (at least 32 characters)
- You can generate one using: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 4. Database Configuration
```
MONGODB_URI=mongodb://localhost:27017/hacksphere
```

### 5. Server Configuration
```
PORT=3000
```

## Complete .env File Example

Create a file named `.env` in the `server` directory with the following content:

```env
# GitHub OAuth Configuration
GITHUB_CLIENT_ID=your_github_client_id_here
GITHUB_CLIENT_SECRET=your_github_client_secret_here
GITHUB_ACCESS_TOKEN=your_github_personal_access_token_here

# JWT Configuration
JWT_SECRET=your_jwt_secret_here

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/hacksphere

# Server Configuration
PORT=3000
```

## Important Notes

1. **Never commit your .env file** - it should be in your .gitignore
2. **Keep your tokens secure** - don't share them publicly
3. **The GitHub access token** should have the necessary permissions to read repositories
4. **For production**, use environment-specific values and secure token storage

## Troubleshooting

- If GitHub repository fetching fails, users can still enter repository URLs manually
- Make sure MongoDB is running if you're using the local database
- Check that all environment variables are properly set before starting the server 