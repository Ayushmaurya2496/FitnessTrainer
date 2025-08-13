const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const axios = require('axios');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const flash = require('connect-flash');

require('dotenv').config();
const connectDB = require('./models/connect');
(() => {
    const raw = process.env.MONGODB_URI || process.env.MONGODB_URL;
    let mongoUri;
    if (raw) {
        const hasDbInPath = /\/(?!\/)[^/?]+(?:\?|$)/.test(raw);
        if (process.env.DB_NAME && !hasDbInPath) {
            mongoUri = `${raw.replace(/\/+$/, '')}/${process.env.DB_NAME}`;
        } else {
            
            mongoUri = raw.replace(/^\/+/, '');
        }
    } else {
        
        mongoUri = 'mongodb://localhost:27017/fitness-trainer';
    }
    connectDB(mongoUri);
})();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const { Session } = require('./models/session');
const { User } = require('./models/user');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use((req, res, next) => {
    if (req.url.endsWith('.wasm')) {
        res.type('application/wasm');
    }
    next();
});
app.use('/vendor', express.static(path.join(__dirname, 'node_modules')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(bodyParser.json({ limit: '5mb' })); 
app.set('trust proxy', 1);

app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI || process.env.MONGODB_URL || 'mongodb://localhost:27017/fitness-trainer',
        touchAfter: 24 * 3600 // lazy session update
    }),
    cookie: {
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));
app.use(flash());

// Expose flash messages to all views
app.use((req, res, next) => {
    res.locals.flashSuccess = req.flash('success');
    res.locals.flashError = req.flash('error');
    next();
});

// Make auth state available to views
app.use((req, res, next) => {
    res.locals.user = null;
    try {
        const jwt = require('jsonwebtoken');
        const token = (req.cookies && req.cookies.accessToken) || null;
        if (token && process.env.ACCESS_TOKEN_SECRET) {
            const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            // Only expose minimal safe fields
            res.locals.user = {
                _id: payload._id,
                username: payload.username,
                email: payload.email,
                fullName: payload.fullName
            };
        }
    } catch (e) {
        console.log(e)
    }
    next();
});

const Progress = mongoose.model('Progress', new mongoose.Schema({
    date: { type: Date, default: Date.now },
    accuracy: { type: Number, min: 0, max: 100 },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
    createdAt: { type: Date, default: Date.now }
}));

app.get('/', (req, res) => {
    res.render('home');
});

// Health check endpoint for Vercel deployment
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});

app.get('/pose', (req, res) => {
    // Allow access to pose page but show protection overlay if not authenticated
    res.render('index');
});

app.get('/index', (req, res) => {
    res.render('index');
});

app.get('/dashboard', (req, res) => {
    if (!res.locals.user) {
        return res.redirect('/?login=1&auto=1&next=/dashboard');
    }
    return res.render('dashboard', { user: res.locals.user });
});

// Auth routes (login)
app.use('/auth', require('./routes/auth'));

const FormData = require('form-data'); 
app.post('/api/pose', async (req, res) => {
    try {
        const { image } = req.body; 
        if (!image) {
            console.error('Pose API error: No image provided');
            return res.status(400).json({ feedback: 'No image provided' });
        }
        
        const base64Data = image.split(',')[1];
        const imgBuffer = Buffer.from(base64Data, 'base64');
     
        const form = new FormData();
        form.append('file', imgBuffer, { filename: 'frame.jpg', contentType: 'image/jpeg' });
        
        const response = await axios.post('http://localhost:8000/analyze_pose/', form, {
            headers: form.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });
        return res.json(response.data);
    } catch (error) {
        
        console.error('Pose API raw error:', error);
        let errMsg = 'Unknown error';
        if (error instanceof AggregateError && Array.isArray(error.errors)) {
            errMsg = error.errors.map(e => e.message).join(' | ');
        }
        else if (error.isAxiosError) {
            if (error.response && error.response.data) {
                errMsg = typeof error.response.data === 'string'
                    ? error.response.data
                    : JSON.stringify(error.response.data);
            } else {
                errMsg = error.message;
            }
        }
        else if (error.message) {
            errMsg = error.message;
        }
        console.error('Pose API parsed error message:', errMsg);
        return res.status(500).json({ feedback: errMsg });
    }
});

// Enhanced session and accuracy management
app.post('/api/save-session', async (req, res) => {
    try {
        const { accuracy, feedback, poseName, landmarks } = req.body;
        
        // Get user from token if available
        let userId = null;
        try {
            const jwt = require('jsonwebtoken');
            const token = req.cookies.accessToken;
            if (token && process.env.ACCESS_TOKEN_SECRET) {
                const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
                userId = payload._id;
            }
        } catch (e) {
            // Continue without user (guest session)
        }

        // Save session data
        const sessionData = {
            user: userId,
            poseName: poseName || 'General Pose',
            accuracy: accuracy || 0,
            feedback: feedback || 'No feedback available',
            landmarks: landmarks ? JSON.stringify(landmarks) : null,
            date: new Date()
        };

        const session = await Session.create(sessionData);
        
        // Also save to Progress model for backward compatibility
        await Progress.create({ 
            accuracy: accuracy || 0,
            date: new Date(),
            userId: userId
        });

        res.json({ 
            success: true, 
            sessionId: session._id,
            message: 'Session saved successfully'
        });
    } catch (error) {
        console.error('Save session error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to save session' 
        });
    }
});

// Get user's session history
app.get('/api/session-history', async (req, res) => {
    try {
        let userId = null;
        try {
            const jwt = require('jsonwebtoken');
            const token = req.cookies.accessToken;
            if (token && process.env.ACCESS_TOKEN_SECRET) {
                const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
                userId = payload._id;
            }
        } catch (e) {
            // Continue without user
        }

        // Get sessions (user-specific or all if guest)
        const query = userId ? { user: userId } : {};
        const sessions = await Session.find(query)
            .sort({ date: -1 })
            .limit(10)
            .lean();

        // Calculate statistics
        const totalSessions = sessions.length;
        const avgAccuracy = totalSessions > 0 
            ? Math.round(sessions.reduce((sum, s) => sum + s.accuracy, 0) / totalSessions)
            : 0;
        const bestAccuracy = totalSessions > 0 
            ? Math.max(...sessions.map(s => s.accuracy))
            : 0;

        res.json({
            success: true,
            sessions: sessions,
            stats: {
                totalSessions,
                avgAccuracy,
                bestAccuracy,
                recentAccuracy: sessions[0]?.accuracy || 0
            }
        });
    } catch (error) {
        console.error('Get session history error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch session history' 
        });
    }
});

// Get real-time accuracy stats
app.get('/api/accuracy-stats', async (req, res) => {
    try {
        let userId = null;
        try {
            const jwt = require('jsonwebtoken');
            const token = req.cookies.accessToken;
            if (token && process.env.ACCESS_TOKEN_SECRET) {
                const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
                userId = payload._id;
            }
        } catch (e) {
            // Continue without user
        }

        // Get recent sessions for stats
        const query = userId ? { user: userId } : {};
        const recentSessions = await Session.find(query)
            .sort({ date: -1 })
            .limit(5)
            .lean();

        const todaySessions = await Session.find({
            ...query,
            date: { 
                $gte: new Date(new Date().setHours(0, 0, 0, 0)) 
            }
        }).lean();

        const todayAvg = todaySessions.length > 0
            ? Math.round(todaySessions.reduce((sum, s) => sum + s.accuracy, 0) / todaySessions.length)
            : 0;

        res.json({
            success: true,
            todayAverage: todayAvg,
            todayCount: todaySessions.length,
            recentSessions: recentSessions.slice(0, 3),
            lastAccuracy: recentSessions[0]?.accuracy || 0
        });
    } catch (error) {
        console.error('Get accuracy stats error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch accuracy stats' 
        });
    }
});

app.post('/save-accuracy', async (req, res) => {
    const { accuracy } = req.body;
    await Progress.create({ accuracy });
    res.json({ success: true });
});



io.on('connection', (socket) => {
    console.log('User connected');
    // Example----socket.emit('pose-alert', { message: 'Straighten Back' });
});

let PORT = parseInt(process.env.PORT) || 3000;
const startServer = (port) => {
    server.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`Port ${port} in use, trying ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error(err);
        }
    });
};

// Only start server if not in Vercel environment
if (!process.env.VERCEL) {
    startServer(PORT);
}

// Export app for Vercel
module.exports = app;
