require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { User } = require('../models/user');

const router = express.Router();

function wantsHTML(req) {
  const acceptsHtml =
    req.headers &&
    typeof req.headers.accept === 'string' &&
    req.headers.accept.includes('text/html');

  const isForm =
    typeof req.is === 'function' &&
    (req.is('application/x-www-form-urlencoded') ||
      req.is('multipart/form-data'));

  const redirectFlag =
    req.query && (req.query.redirect === '1' || req.query.html === '1');

  return Boolean(acceptsHtml || isForm || redirectFlag);
}

router.use(cookieParser());

function toSafeUser(user) {
  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    avatar: user.avatar,
    coverImage: user.coverImage,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function requireAuth(req, res, next) {
  try {
    const bearer = req.headers['authorization'] || '';
    const raw =
      (req.cookies && req.cookies.accessToken) ||
      (bearer.startsWith('Bearer ') ? bearer.slice(7) : null);

    if (!raw) return res.status(401).json({ message: 'Unauthorized' });

    let decoded;
    try {
      decoded = jwt.verify(raw, process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid token', error: err.message });
    }

    const user = await User.findById(decoded?._id).select('-password -refreshToken');
    if (!user) return res.status(401).json({ message: 'Invalid token' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized', error: err?.message || 'invalid token' });
  }
}

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};
//register
router.post('/register', async (req, res) => {
  try {
    console.log(' Registration attempt for:', req.body?.username, req.body?.email);
    const { username, email, fullName, password, avatar } = req.body || {};

    if (!username || !email || !fullName || !password) {
      console.log(' Registration failed: Missing required fields');
      if (wantsHTML(req)) return res.status(400).redirect('/auth/register?error=missing');
      return res.status(400).json({ message: 'username, email, fullName, password are required' });
    }

    const exists = await User.findOne({
      $or: [
        { username: username.toLowerCase().trim() },
        { email: email.toLowerCase().trim() },
      ],
    });

    if (exists) {
      console.log(' Registration failed: User already exists with username/email:', username, email);
      if (wantsHTML(req)) return res.status(409).redirect('/auth/register?error=exists');
      return res.status(409).json({ message: 'User with same username or email exists' });
    }

    const user = await User.create({
      username: username.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      fullName: fullName.trim(),
      password,
      avatar: (avatar && String(avatar).trim()) || '/images/logo.svg',
      coverImage: ''
    });

    if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
      console.error('Missing JWT secrets in register:', {
        ACCESS_TOKEN_SECRET: !!process.env.ACCESS_TOKEN_SECRET,
        REFRESH_TOKEN_SECRET: !!process.env.REFRESH_TOKEN_SECRET,
        NODE_ENV: process.env.NODE_ENV
      });
      if (wantsHTML(req)) return res.redirect('/?login=1&auto=1&registered=1');
      return res.status(201).json({ message: 'User registered (token secrets missing)', user: toSafeUser(user) });
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    if (wantsHTML(req)) {
      return res
        .cookie('accessToken', accessToken, cookieOptions)
        .cookie('refreshToken', refreshToken, cookieOptions)
        .redirect('/');
    }
    return res
      .cookie('accessToken', accessToken, cookieOptions)
      .cookie('refreshToken', refreshToken, cookieOptions)
      .status(201)
      .json({ message: 'Registered', user: toSafeUser(user), accessToken, refreshToken });
  } catch (err) {
    console.error('Register error:', err);
    if (wantsHTML(req)) return res.status(500).redirect('/auth/register?error=server');
    return res.status(500).json({ message: 'Register failed', error: err?.message || 'unknown' });
  }
});

// ===================== LOGIN PAGE =====================
router.get('/register', (req, res) => {
  if (req.cookies && req.cookies.accessToken) return res.redirect('/dashboard');
  return res.render('auth/register', { query: req.query || {} });
});

router.get('/login', (req, res) => {
  if (req.cookies && req.cookies.accessToken) return res.redirect('/dashboard');
  return res.render('auth/login', { query: req.query || {} });
});

// ===================== LOGIN =====================
router.post('/login', async (req, res) => {
  try {
    console.log('🔄 Login attempt for:', req.body?.username || req.body?.email);
    const { email, username, password } = req.body || {};

    if (!password || (!email && !username)) {
      console.log(' Login failed: Missing credentials');
      if (wantsHTML(req)) { req.flash?.('error', 'Email/username and password are required'); return res.redirect('/auth/login'); }
      return res.status(400).json({ message: 'username or email and password are required' });
    }

    const user = await User.findOne({
      $or: [
        ...(email ? [{ email: email.toLowerCase().trim() }] : []),
        ...(username ? [{ username: username.toLowerCase().trim() }] : []),
      ],
    });

    if (!user) {
      console.log('Login failed: User not found for:', username || email);
      if (wantsHTML(req)) { req.flash?.('error', 'User not found'); return res.redirect('/auth/login'); }
      return res.status(404).json({ message: 'User not found' });
    }

    const ok = await user.isPasswordCorrect(password);
    if (!ok) {
      console.log('Login failed: Invalid password for:', user.username);
      if (wantsHTML(req)) { req.flash?.('error', 'Invalid credentials'); return res.redirect('/auth/login'); }
      return res.status(401).json({ message: 'Invalid credentials' });
    }

   
    console.log('Environment check:', {
      ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET ? 'SET' : 'NOT SET',
      REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET ? 'SET' : 'NOT SET'
    });

    if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
      console.error('Missing JWT secrets:', {
        ACCESS_TOKEN_SECRET: !!process.env.ACCESS_TOKEN_SECRET,
        REFRESH_TOKEN_SECRET: !!process.env.REFRESH_TOKEN_SECRET
      });
      if (wantsHTML(req)) { req.flash?.('error', 'Server auth misconfigured'); return res.redirect('/auth/login'); }
      return res.status(500).json({ message: 'Server auth not configured (missing token secrets)' });
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    console.log('Login successful for user:', user.username, user.email);

    const safeUser = toSafeUser(user);

    if (wantsHTML(req)) {
      req.flash?.('success', 'Logged in successfully');
      const next = (req.query && req.query.next) || '/dashboard';
      return res
        .cookie('accessToken', accessToken, cookieOptions)
        .cookie('refreshToken', refreshToken, cookieOptions)
        .redirect(next);
    }
    return res
      .cookie('accessToken', accessToken, cookieOptions)
      .cookie('refreshToken', refreshToken, cookieOptions)
      .status(200)
      .json({ message: 'Logged in', user: safeUser, accessToken, refreshToken });
  } catch (err) {
    console.error('Login error:', err);
    if (wantsHTML(req)) { req.flash?.('error', 'Login failed'); return res.redirect('/auth/login'); }
    return res.status(500).json({ message: 'Login failed', error: err?.message || 'unknown' });
  }
});

// ===================== LOGOUT =====================
router.post('/logout', async (req, res) => {
  try {
    console.log('Logout attempt...');
    let userId = null;
    try {
      const bearer = req.headers['authorization'] || '';
      const raw =
        (req.cookies && req.cookies.accessToken) ||
        (bearer.startsWith('Bearer ') ? bearer.slice(7) : null);
      
      if (raw) {
        const decoded = jwt.verify(raw, process.env.ACCESS_TOKEN_SECRET);
        userId = decoded?._id;
      }
    } catch (err) {
     
      console.log('Token verification failed during logout:', err.message);
    }
    if (userId) {
      await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } }, { new: true });
      console.log(' Cleared refresh token for user ID:', userId);
    } else {
      console.log(' No valid user ID found, skipping database cleanup');
    }

    const cookieOptions = {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    };

    if (wantsHTML(req)) {
      req.flash?.('success', 'Logged out');
      console.log('Logout successful (HTML redirect)');
      return res.clearCookie('accessToken', cookieOptions).clearCookie('refreshToken', cookieOptions).redirect('/');
    }
    console.log('Logout successful (JSON response)');
    return res.clearCookie('accessToken', cookieOptions).clearCookie('refreshToken', cookieOptions).status(200).json({ message: 'Logged out' });
  } catch (err) {
    console.error('Logout error:', err);
    const cookieOptions = {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    };
    
    if (wantsHTML(req)) {
      req.flash?.('success', 'Logged out');
      return res.clearCookie('accessToken', cookieOptions).clearCookie('refreshToken', cookieOptions).redirect('/');
    }
    return res.clearCookie('accessToken', cookieOptions).clearCookie('refreshToken', cookieOptions).status(200).json({ message: 'Logged out' });
  }
});

// ===================== REFRESH TOKEN =====================
router.post('/refresh', async (req, res) => {
  try {
    const incoming = (req.cookies && req.cookies.refreshToken) || req.body?.refreshToken;
    if (!incoming) return res.status(401).json({ message: 'No refresh token' });

    let decoded;
    try {
      decoded = jwt.verify(incoming, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid refresh token', error: err.message });
    }

    const user = await User.findById(decoded?._id);
    if (!user) return res.status(401).json({ message: 'Invalid refresh token' });
    if (incoming !== user.refreshToken) return res.status(401).json({ message: 'Refresh token mismatch' });

    const accessToken = user.generateAccessToken();
    const newRefresh = user.generateRefreshToken();
    user.refreshToken = newRefresh;
    await user.save({ validateBeforeSave: false });

    if (wantsHTML(req)) {
      req.flash?.('success', 'Session refreshed');
      return res
        .cookie('accessToken', accessToken, cookieOptions)
        .cookie('refreshToken', newRefresh, cookieOptions)
        .redirect('/dashboard');
    }
    return res
      .cookie('accessToken', accessToken, cookieOptions)
      .cookie('refreshToken', newRefresh, cookieOptions)
      .status(200)
      .json({ message: 'Refreshed', accessToken, refreshToken: newRefresh });
  } catch (err) {
    if (wantsHTML(req)) { req.flash?.('error', 'Invalid refresh token'); return res.redirect('/auth/login'); }
    return res.status(401).json({ message: 'Invalid refresh token', error: err?.message || 'unknown' });
  }
});


router.get('/me', requireAuth, (req, res) => {
  return res.status(200).json({ user: req.user });
});

module.exports = router;
