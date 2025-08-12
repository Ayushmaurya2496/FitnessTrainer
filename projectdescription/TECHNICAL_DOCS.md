# Technical Documentation - AI Fitness Trainer

## System Architecture

### Application Structure
```
fitness-trainer/
├── App.js                 # Main Express server
├── package.json           # Dependencies and scripts
├── models/               # Database models
│   ├── connect.js        # MongoDB connection
│   ├── user.js          # User model
│   └── session.js       # Session model
├── routes/              # API routes
│   ├── auth.js          # Authentication routes
│   └── user.routes.js   # User management routes
├── views/               # EJS templates
│   ├── home.ejs         # Landing page
│   ├── index.ejs        # Pose detection page
│   └── dashboard.ejs    # User dashboard
├── public/              # Static assets
│   ├── css/            # Stylesheets
│   ├── js/             # Client-side JavaScript
│   └── images/         # Static images
└── controllers/         # Business logic
    └── user.controller.js
```

## Core Technologies

### Backend Stack
- **Express.js**: Web application framework
- **MongoDB**: Document-based database
- **Mongoose**: MongoDB object modeling
- **Socket.io**: Real-time bidirectional communication
- **JWT**: JSON Web Token authentication
- **bcrypt**: Password hashing

### Frontend Stack
- **MediaPipe**: Google's ML framework for pose detection
- **Canvas API**: For drawing pose landmarks
- **WebRTC**: Camera access and video streaming
- **EJS**: Embedded JavaScript templating
- **Vanilla JavaScript**: Client-side interactivity

### Database Schema

#### User Model
```javascript
{
  username: String (required, unique),
  email: String (required, unique),
  fullName: String (required),
  password: String (required, hashed),
  createdAt: Date (default: now),
  lastLogin: Date
}
```

#### Progress Model
```javascript
{
  date: Date (default: now),
  accuracy: Number,
  userId: ObjectId (reference to User)
}
```

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout

### Pose Analysis
- `POST /api/pose` - Process pose image and get feedback
- `POST /save-accuracy` - Save workout accuracy data

### User Management
- `GET /dashboard` - User dashboard (protected)
- `GET /pose` - Pose detection page
- `GET /` - Home page

## Security Features

### Authentication Flow
1. User submits credentials
2. Server validates against database
3. JWT token generated and sent as HTTP-only cookie
4. Token verified on protected routes
5. User data exposed to templates via middleware

### Data Protection
- Passwords hashed with bcrypt (salt rounds: 10)
- JWT tokens stored in HTTP-only cookies
- CSRF protection via same-site cookie policy
- Input validation and sanitization
- Secure session management

## Real-Time Features

### Socket.io Integration
- Real-time pose feedback
- Live workout coaching
- Connection status monitoring
- Event-driven architecture

### MediaPipe Pose Detection
- 33 body landmark detection
- Real-time processing at 30 FPS
- Confidence scoring for accuracy
- Cross-browser compatibility

## Performance Optimizations

### Frontend Optimizations
- CDN fallbacks for MediaPipe libraries
- Image compression for pose data
- Efficient canvas rendering
- Lazy loading of resources

### Backend Optimizations
- Connection pooling for MongoDB
- Middleware caching
- Compression for static assets
- Optimized image processing pipeline

## Error Handling

### Client-side Error Management
- Camera permission handling
- MediaPipe loading fallbacks
- Network error recovery
- User-friendly error messages

### Server-side Error Handling
- Comprehensive try-catch blocks
- Structured error responses
- Logging for debugging
- Graceful degradation

## Development Workflow

### Local Development Setup
1. Install Node.js and MongoDB
2. Clone repository
3. Install dependencies: `npm install`
4. Create `.env` file with required variables
5. Start development server: `npm start`

### Environment Variables
```
MONGODB_URI=mongodb://localhost:27017/fitness-trainer
SESSION_SECRET=your-session-secret
ACCESS_TOKEN_SECRET=your-jwt-secret
NODE_ENV=development
PORT=3000
```

## Deployment Considerations

### Production Setup
- Use production MongoDB instance
- Set secure environment variables
- Enable HTTPS/SSL certificates
- Configure reverse proxy (Nginx)
- Set up monitoring and logging

### Scalability Features
- Horizontal scaling support
- Load balancer compatibility
- Session store externalization
- CDN integration for static assets

## Testing Strategy

### Unit Testing
- Model validation tests
- API endpoint testing
- Authentication flow testing
- Pose detection accuracy tests

### Integration Testing
- End-to-end user workflows
- Database integration tests
- Real-time communication tests
- Cross-browser compatibility

## Monitoring & Analytics

### Performance Metrics
- Response times
- Database query performance
- Real-time connection stats
- User engagement metrics

### Error Tracking
- Client-side error logging
- Server error monitoring
- Database connection issues
- MediaPipe loading failures

## Security Audit

### Regular Security Checks
- Dependency vulnerability scanning
- Code security analysis
- Authentication penetration testing
- Data encryption verification

This technical documentation provides a comprehensive overview of the AI Fitness Trainer's architecture, implementation details, and operational considerations.
