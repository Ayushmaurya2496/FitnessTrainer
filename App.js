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
startServer(PORT);
