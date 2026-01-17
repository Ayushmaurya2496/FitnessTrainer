const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const axios = require('axios');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash');

require('dotenv').config();
const connectDB = require('./models/connect');

(async () => {
    try {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) throw new Error('MONGODB_URI is not defined in .env file');

        console.log('Connecting to MongoDB Atlas...');
        await connectDB(mongoUri);
    } catch (err) {
        console.error('Database connection failed:', err.message);
        process.exit(1);
    }
})();

const app = express();
let server = null;
let io = null;
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
    saveUninitialized: true,
    cookie: {
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
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
app.get('/pose', (req, res) => {
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
// Configure Python backend URL (Render or local)
const PY_BACKEND_URL = process.env.PY_BACKEND_URL || 'http://localhost:8000';
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
        
    const response = await axios.post(`${PY_BACKEND_URL.replace(/\/$/, '')}/analyze_pose/`, form, {
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
            console.log(e);
        }
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
    try {
        const { accuracy } = req.body || {};
        if (typeof accuracy !== 'number' || Number.isNaN(accuracy)) {
            return res.status(400).json({ success: false, error: 'Invalid accuracy' });
        }
        const normalized = Math.max(0, Math.min(100, Math.round(accuracy)));
        await Progress.create({ accuracy: normalized });
        return res.json({ success: true });
    } catch (error) {
        console.error('Save accuracy error:', error);
        return res.status(500).json({ success: false, error: 'Failed to save accuracy' });
    }
});

// Socket.io only when available (local/serverful)
function wireSockets() {
    if (!io) return;
    io.on('connection', (socket) => {
        console.log('User connected');
        // Example----socket.emit('pose-alert', { message: 'Straighten Back' });
    });
}

// If running on Vercel serverless, export the app instead of listening on a port
if (process.env.VERCEL) {
    module.exports = app;
} else {
    // Local/standalone server start with port fallback
    server = http.createServer(app);
    io = socketIo(server);
    wireSockets();
    let PORT = Number(process.env.PORT) || 3000;
    const startServer = (port) => {
        try {
            server.listen(port, '0.0.0.0', () => {
                console.log(`Server listening on port ${port}`);
            });
            server.on('error', (err) => {
                if (err && err.code === 'EADDRINUSE') {
                    const next = port + 1;
                    console.error(`Port ${port} in use, trying ${next}...`);
                    startServer(next);
                } else {
                    console.error('Server error:', err);
                }
            });
        } catch (e) {
            console.error('Failed to start server:', e?.message || e);
        }
    };
    startServer(PORT);
}
