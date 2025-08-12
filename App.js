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
(() => {
    // Use Render's provided MONGODB_URI or fallback to local
    const raw = process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/fitness-trainer';
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
const io = socketIo(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' 
            ? [process.env.FRONTEND_URL, process.env.RENDER_EXTERNAL_URL].filter(Boolean)
            : ["http://localhost:3000", "http://127.0.0.1:3000"],
        methods: ["GET", "POST"]
    }
});

// Security middleware for production
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        next();
    });
}

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
    secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
    resave: false,
    saveUninitialized: false, // Changed to false for production
    cookie: {
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
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
    accuracy: Number
}));

app.get('/', (req, res) => {
    res.render('home');
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
        
        // Use environment variable for pose analysis service URL
        const poseServiceUrl = process.env.POSE_SERVICE_URL || 'http://localhost:8000';
        
        const response = await axios.post(`${poseServiceUrl}/analyze_pose/`, form, {
            headers: form.getHeaders(),
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 10000 // 10 second timeout
        });
        return res.json(response.data);
    } catch (error) {
        console.error('Pose API raw error:', error);
        let errMsg = 'Pose analysis service unavailable';
        
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            errMsg = 'Pose analysis service is currently offline. Please try again later.';
        } else if (error.isAxiosError) {
            if (error.response && error.response.data) {
                errMsg = typeof error.response.data === 'string'
                    ? error.response.data
                    : JSON.stringify(error.response.data);
            } else {
                errMsg = error.message;
            }
        } else if (error.message) {
            errMsg = error.message;
        }
        
        console.error('Pose API parsed error message:', errMsg);
        return res.status(500).json({ feedback: errMsg });
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

let PORT = process.env.PORT || 3000;
const startServer = (port) => {
    server.listen(port, '0.0.0.0', () => {
        console.log(`Server running on port ${port}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE' && process.env.NODE_ENV !== 'production') {
            console.error(`Port ${port} in use, trying ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error('Server error:', err);
            process.exit(1);
        }
    });
};
startServer(PORT);
