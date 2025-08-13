# Fitness Trainer - Vercel Deployment Guide

## 🚀 Deploy to Vercel

This project is ready for deployment on Vercel. Follow these steps:

### 1. Prerequisites
- GitHub account with this repository
- Vercel account (free tier available)
- MongoDB Atlas account (for database)

### 2. Environment Variables
Before deploying, set up these environment variables in Vercel:

```bash
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name
DB_NAME=fitness-trainer
NODE_ENV=production
SESSION_SECRET=your-super-secret-session-key-here
PORT=3000
```

### 3. Deployment Steps

#### Option A: Deploy via Vercel Dashboard
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import this GitHub repository
4. Configure environment variables in the dashboard
5. Click "Deploy"

#### Option B: Deploy via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project directory
vercel

# Follow the prompts and configure environment variables
```

### 4. MongoDB Setup
1. Create a MongoDB Atlas account
2. Create a new cluster
3. Get your connection string
4. Add it to Vercel environment variables as `MONGODB_URI`

### 5. Features Available
- ✅ Real-time pose detection using MediaPipe
- ✅ Session management with MongoDB storage
- ✅ Interactive UI with accuracy tracking
- ✅ Session history and analytics
- ✅ Dark theme interface
- ✅ Responsive design

### 6. Post-Deployment
After successful deployment:
- Your app will be available at `https://your-project-name.vercel.app`
- Environment variables are automatically configured
- Database connections are established
- All pose detection features are functional

### 7. Troubleshooting
- **Database Connection Issues**: Verify MongoDB URI and network access
- **Static Files**: Ensure all CSS/JS files are in the `public` directory
- **Environment Variables**: Double-check all required variables are set

### 8. Local Development
```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Start development server
npm run dev
```

## 📱 Features
- Real-time pose detection
- Session tracking and analytics
- User-friendly interface
- Mobile-responsive design
- Database persistence

## 🛠️ Tech Stack
- **Frontend**: HTML5, CSS3, JavaScript, MediaPipe
- **Backend**: Node.js, Express.js
- **Database**: MongoDB Atlas
- **Deployment**: Vercel
- **Real-time**: Socket.io
