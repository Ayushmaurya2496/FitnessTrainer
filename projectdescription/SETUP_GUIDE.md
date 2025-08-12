# Project Setup & Installation Guide

## Prerequisites

Before setting up the AI Fitness Trainer application, ensure you have the following installed on your system:

### Required Software
- **Node.js** (v14.0 or higher) - [Download here](https://nodejs.org/)
- **MongoDB** (v4.4 or higher) - [Download here](https://www.mongodb.com/try/download/community)
- **Git** - [Download here](https://git-scm.com/downloads)
- **Modern Web Browser** with webcam support (Chrome, Firefox, Edge, Safari)

### Optional Tools
- **MongoDB Compass** - GUI for MongoDB management
- **Postman** - API testing tool
- **VS Code** - Recommended code editor

## Installation Steps

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/ai-fitness-trainer.git
cd ai-fitness-trainer
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:
```env
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/fitness-trainer
DB_NAME=fitness-trainer

# Authentication Secrets
SESSION_SECRET=your-super-secret-session-key-here
ACCESS_TOKEN_SECRET=your-jwt-secret-key-here

# Server Configuration
NODE_ENV=development
PORT=3000

# Python Backend (if using separate pose analysis service)
PYTHON_BACKEND_URL=http://localhost:8000
```

### 4. Database Setup

#### Option A: Local MongoDB
1. Start MongoDB service:
   ```bash
   # Windows
   net start MongoDB
   
   # macOS (with Homebrew)
   brew services start mongodb-community
   
   # Linux
   sudo systemctl start mongod
   ```

2. Create database (optional - will be created automatically):
   ```bash
   mongosh
   use fitness-trainer
   ```

#### Option B: MongoDB Atlas (Cloud)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get connection string and update `MONGODB_URI` in `.env`

### 5. Start the Application
```bash
npm start
```

The application will be available at: `http://localhost:3000`

## Detailed Configuration

### Package.json Scripts
```json
{
  "scripts": {
    "start": "node App.js",
    "dev": "nodemon App.js",
    "test": "jest",
    "lint": "eslint .",
    "format": "prettier --write ."
  }
}
```

### Dependencies Overview
```json
{
  "dependencies": {
    "@mediapipe/camera_utils": "^0.3.1675466862",
    "@mediapipe/drawing_utils": "^0.3.1675466124", 
    "@mediapipe/pose": "^0.5.1675469404",
    "axios": "^1.4.0",
    "bcrypt": "^6.0.0",
    "body-parser": "^1.20.2",
    "connect-flash": "^0.1.1",
    "cookie-parser": "^1.4.7",
    "dotenv": "^16.3.1",
    "ejs": "^3.1.10",
    "express": "^4.18.2",
    "express-session": "^1.18.2",
    "form-data": "^4.0.0",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.16.5",
    "socket.io": "^4.8.1"
  }
}
```

## Development Setup

### 1. Development Dependencies (Optional)
```bash
npm install --save-dev nodemon eslint prettier jest
```

### 2. VS Code Configuration

Create `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "emmet.includeLanguages": {
    "ejs": "html"
  }
}
```

### 3. ESLint Configuration

Create `.eslintrc.js`:
```javascript
module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'off'
  }
};
```

## Troubleshooting

### Common Issues

#### 1. MongoDB Connection Error
```
Error: MongoNetworkError: failed to connect to server
```
**Solution:**
- Ensure MongoDB service is running
- Check connection string in `.env`
- Verify network connectivity

#### 2. MediaPipe Loading Issues
```
Error: Failed to load MediaPipe pose model
```
**Solution:**
- Check internet connection for CDN access
- Verify `/vendor` route is serving files correctly
- Clear browser cache and reload

#### 3. Camera Permission Denied
```
Error: Permission denied for camera access
```
**Solution:**
- Allow camera permissions in browser
- Ensure HTTPS in production (required for camera)
- Check if another application is using camera

#### 4. Port Already in Use
```
Error: EADDRINUSE: address already in use :::3000
```
**Solution:**
- Kill process using port: `npx kill-port 3000`
- Change PORT in `.env` file
- Use different port: `PORT=3001 npm start`

### Development Tips

#### 1. Live Reload Setup
```bash
npm install -g nodemon
nodemon App.js
```

#### 2. Debug Mode
```bash
DEBUG=* npm start
```

#### 3. MongoDB GUI Access
Use MongoDB Compass with connection string:
```
mongodb://localhost:27017/fitness-trainer
```

## Production Deployment

### 1. Environment Variables (Production)
```env
NODE_ENV=production
MONGODB_URI=your-production-mongodb-uri
SESSION_SECRET=your-strong-production-secret
ACCESS_TOKEN_SECRET=your-strong-jwt-secret
PORT=80
```

### 2. Security Considerations
- Use HTTPS in production
- Set secure session cookies
- Enable rate limiting
- Use production MongoDB with authentication

### 3. Performance Optimization
- Enable gzip compression
- Use CDN for static assets
- Implement caching strategies
- Monitor application performance

## Testing

### Run Tests
```bash
npm test
```

### Test Coverage
```bash
npm run test:coverage
```

## Support & Documentation

### Useful Commands
```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# List installed packages
npm list

# Update dependencies
npm update

# Check for security vulnerabilities
npm audit

# Fix security issues
npm audit fix
```

### Getting Help
- Check GitHub Issues
- Review documentation in `/projectdescription`
- Contact support team
- Community forums

This setup guide should get you up and running with the AI Fitness Trainer application. Follow the steps carefully and refer to the troubleshooting section if you encounter any issues.
