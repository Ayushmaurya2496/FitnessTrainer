# Python Backend - AI Fitness Trainer

Python backend service for real-time pose analysis using MediaPipe.

## 🚀 Quick Start

### Windows:
```bash
cd python-backend
start.bat
```

### Linux/Mac:
```bash
cd python-backend
chmod +x start.sh
./start.sh
```

### Manual Installation:
```bash
cd python-backend
pip install -r requirements.txt
python pose_analyzer.py
```

## 📁 Files Overview

- **`pose_analyzer.py`** - FastAPI backend service (port 8000)
- **`webcam_detector.py`** - Standalone webcam pose detection
- **`rtsp_detector.py`** - RTSP camera pose detection
- **`requirements.txt`** - Python dependencies
- **`start.bat/start.sh`** - Startup scripts

## 🔧 Configuration

### MediaPipe Settings (Improved Accuracy):
```python
pose = mp_pose.Pose(
    model_complexity=2,              # Heavy model for better accuracy
    min_detection_confidence=0.7,    # Increased from 0.5
    min_tracking_confidence=0.6      # Increased from 0.5
)
```

### RTSP Camera URL:
Update in `rtsp_detector.py`:
```python
camera_url = "rtsp://admin:admin%40123@YOUR_CAMERA_IP:554/..."
```

## 🌐 API Endpoints

### FastAPI Service (http://localhost:8000):
- **`GET /`** - Service info
- **`POST /analyze_pose/`** - Analyze pose from uploaded image
- **`POST /analyze_pose_base64/`** - Analyze pose from base64 image
- **`GET /health`** - Health check

### Example API Usage:
```python
import requests

# Upload image file
with open('pose_image.jpg', 'rb') as f:
    response = requests.post('http://localhost:8000/analyze_pose/', 
                           files={'file': f})
print(response.json())
```

## 🔗 Integration with Node.js App

The FastAPI service automatically connects to your main Node.js app running on port 3000. The Node.js app sends pose analysis requests to this Python service.

## 🎯 Usage Options

### 1. Backend Service (Recommended):
```bash
python pose_analyzer.py
```
- Runs FastAPI service on port 8000
- Integrates with main Node.js fitness app
- Provides REST API for pose analysis

### 2. Standalone Webcam Detection:
```bash
python webcam_detector.py
```
- Direct webcam pose detection
- Real-time feedback display
- Independent of main app

### 3. RTSP Camera Detection:
```bash
python rtsp_detector.py
```
- IP camera pose detection
- Supports security cameras
- Real-time analysis

## 🛠️ Dependencies

- **FastAPI** - Web API framework
- **MediaPipe** - Pose detection
- **OpenCV** - Computer vision
- **NumPy** - Numerical computing
- **Pillow** - Image processing
- **Uvicorn** - ASGI server

## 📊 Performance Improvements

### Accuracy Enhancements:
1. **Model Complexity**: Set to 2 (Heavy model)
2. **Detection Confidence**: Increased to 0.7
3. **Tracking Confidence**: Increased to 0.6
4. **Enhanced Landmark Analysis**: More precise feedback

### Real-time Features:
- Shoulder alignment detection
- Hip alignment checking
- Posture stability analysis
- Accuracy scoring (0-100%)

## 🐛 Troubleshooting

### Common Issues:

1. **Import Errors**: Install dependencies with `pip install -r requirements.txt`
2. **Camera Access**: Ensure no other apps are using the camera
3. **RTSP Connection**: Check network and camera URL
4. **Port 8000 in Use**: Kill existing process or change port

### Error Messages:
- **"No pose detected"**: Ensure full body is visible in camera
- **"Camera permission denied"**: Allow camera access in browser/OS
- **"Connection refused"**: Check if service is running on port 8000

## 🔄 Development

### Adding New Exercise Analysis:
1. Add method to `PoseAnalyzer` class in `pose_analyzer.py`
2. Update `exercise_templates` dictionary
3. Implement specific landmark checks for the exercise

### Testing:
```bash
# Test API service
curl http://localhost:8000/health

# Test specific endpoint
curl -X POST http://localhost:8000/analyze_pose/ \
  -F "file=@test_image.jpg"
```

---

This Python backend provides enhanced pose detection capabilities for the AI Fitness Trainer application with improved accuracy and real-time analysis features.
