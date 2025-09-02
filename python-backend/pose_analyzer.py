"""
AI Fitness Trainer - Python Backend Service
Real-time pose analysis using MediaPipe
Port: 8000 (connects with Node.js main app)
"""

import cv2
import mediapipe as mp
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import uvicorn
import io
from PIL import Image
import base64
import json

# Initialize FastAPI app
app = FastAPI(title="AI Fitness Trainer - Pose Analysis API")

# Add CORS middleware to allow requests from Node.js/Vercel app (configurable)
origins_env = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
allowed_origins = [o.strip() for o in origins_env.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize MediaPipe Pose with improved accuracy settings
mp_pose = mp.solutions.pose
pose = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=2,                    # Heavy model for better accuracy
    enable_segmentation=True,
    min_detection_confidence=0.7,          # Increased from 0.5
    min_tracking_confidence=0.6            # Increased from 0.5
)
mp_draw = mp.solutions.drawing_utils

class PoseAnalyzer:
    def __init__(self):
        self.exercise_templates = {
            "plank": self.analyze_plank,
            "squat": self.analyze_squat,
            "pushup": self.analyze_pushup,
            "general": self.analyze_general_posture
        }
    
    def analyze_pose(self, image_array):
        """Main pose analysis function"""
        try:
            # Convert BGR to RGB
            rgb_image = cv2.cvtColor(image_array, cv2.COLOR_BGR2RGB)
            
            # Process with MediaPipe
            results = pose.process(rgb_image)
            
            if not results.pose_landmarks:
                return {
                    "success": False,
                    "feedback": "No pose detected. Please ensure you're fully visible in the camera.",
                    "accuracy": 0,
                    "landmarks": None
                }
            
            # Extract landmarks
            landmarks = self.extract_landmarks(results.pose_landmarks)
            
            # Analyze posture
            analysis = self.analyze_general_posture(landmarks)
            
            return {
                "success": True,
                "feedback": analysis["feedback"],
                "accuracy": analysis["accuracy"],
                "landmarks": landmarks,
                "detailed_analysis": analysis["details"]
            }
            
        except Exception as e:
            return {
                "success": False,
                "feedback": f"Analysis error: {str(e)}",
                "accuracy": 0,
                "landmarks": None
            }
    
    def extract_landmarks(self, pose_landmarks):
        """Extract pose landmarks with names"""
        landmarks = {}
        
        # Key landmarks for fitness analysis
        landmark_names = {
            0: "nose", 11: "left_shoulder", 12: "right_shoulder",
            13: "left_elbow", 14: "right_elbow", 15: "left_wrist", 16: "right_wrist",
            23: "left_hip", 24: "right_hip", 25: "left_knee", 26: "right_knee",
            27: "left_ankle", 28: "right_ankle"
        }
        
        for idx, landmark in enumerate(pose_landmarks.landmark):
            if idx in landmark_names:
                landmarks[landmark_names[idx]] = {
                    "x": landmark.x,
                    "y": landmark.y,
                    "z": landmark.z,
                    "visibility": landmark.visibility
                }
        
        return landmarks
    
    def calculate_angle(self, point1, point2, point3):
        """Calculate angle between three points"""
        try:
            # Validate inputs
            for p in (point1, point2, point3):
                if p is None or "x" not in p or "y" not in p:
                    return 0
            # Convert to numpy arrays
            a = np.array([point1["x"], point1["y"]], dtype=float)
            b = np.array([point2["x"], point2["y"]], dtype=float)
            c = np.array([point3["x"], point3["y"]], dtype=float)
            
            # Calculate vectors
            ba = a - b
            bc = c - b
            
            # Avoid division by zero
            norm_ba = np.linalg.norm(ba)
            norm_bc = np.linalg.norm(bc)
            if norm_ba == 0 or norm_bc == 0:
                return 0
            
            # Calculate angle
            cosine_angle = np.dot(ba, bc) / (norm_ba * norm_bc)
            angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
            
            return float(np.degrees(angle))
        except Exception:
            return 0
    
    def analyze_general_posture(self, landmarks):
        """General posture analysis"""
        feedback = []
        accuracy_score = 100
        details = {}
        
        # Check if all required landmarks are visible
        required_landmarks = ["left_shoulder", "right_shoulder", "left_hip", "right_hip"]
        for landmark in required_landmarks:
            if landmark not in landmarks or landmarks[landmark]["visibility"] < 0.5:
                return {
                    "feedback": "Please ensure your full body is visible in the camera",
                    "accuracy": 20,
                    "details": {"error": "Insufficient landmark visibility"}
                }
        
        # 1. Shoulder alignment
        left_shoulder = landmarks["left_shoulder"]
        right_shoulder = landmarks["right_shoulder"]
        shoulder_height_diff = abs(left_shoulder["y"] - right_shoulder["y"])
        
        if shoulder_height_diff > 0.05:  # 5% threshold
            feedback.append("Keep your shoulders level")
            accuracy_score -= 15
        else:
            feedback.append("Good shoulder alignment")
        
        details["shoulder_alignment"] = {
            "height_difference": shoulder_height_diff,
            "status": "good" if shoulder_height_diff <= 0.05 else "needs_improvement"
        }
        
        # 2. Hip alignment
        left_hip = landmarks["left_hip"]
        right_hip = landmarks["right_hip"]
        hip_height_diff = abs(left_hip["y"] - right_hip["y"])
        
        if hip_height_diff > 0.03:  # 3% threshold
            feedback.append("Align your hips properly")
            accuracy_score -= 10
        else:
            feedback.append("Good hip alignment")
        
        details["hip_alignment"] = {
            "height_difference": hip_height_diff,
            "status": "good" if hip_height_diff <= 0.03 else "needs_improvement"
        }
        
        # 3. Back straightness (using shoulder to hip line)
        avg_shoulder_y = (left_shoulder["y"] + right_shoulder["y"]) / 2
        avg_hip_y = (left_hip["y"] + right_hip["y"]) / 2
        
        if avg_shoulder_y > avg_hip_y:  # Shoulders should be above hips
            feedback.append("Maintain upright posture")
            accuracy_score -= 20
        
        # 4. Overall stability check
        if len([l for l in landmarks.values() if l["visibility"] > 0.8]) >= 8:
            feedback.append("Good pose stability")
        else:
            feedback.append("Try to stay more stable")
            accuracy_score -= 10
        
        # Ensure accuracy doesn't go below 0
        accuracy_score = max(0, accuracy_score)
        
        return {
            "feedback": " | ".join(feedback) if feedback else "Great posture!",
            "accuracy": accuracy_score,
            "details": details
        }
    
    def analyze_plank(self, landmarks):
        """Analyze plank position"""
        # Implementation for plank analysis
        # Similar structure as general posture but with plank-specific checks
        pass
    
    def analyze_squat(self, landmarks):
        """Analyze squat position"""
        # Implementation for squat analysis
        pass
    
    def analyze_pushup(self, landmarks):
        """Analyze push-up position"""
        # Implementation for push-up analysis
        pass

# Initialize pose analyzer
analyzer = PoseAnalyzer()

@app.get("/")
async def root():
    return {
        "message": "AI Fitness Trainer - Pose Analysis API",
        "status": "running",
        "version": "1.0.0"
    }

@app.post("/analyze_pose/")
async def analyze_pose(file: UploadFile = File(...)):
    """
    Analyze pose from uploaded image
    Expects: image file (JPG, PNG)
    Returns: pose analysis results
    """
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image file
        image_data = await file.read()
        
        # Convert to OpenCV format
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        # Analyze pose
        result = analyzer.analyze_pose(image)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/analyze_pose_base64/")
async def analyze_pose_base64(data: dict):
    """
    Analyze pose from base64 encoded image
    Expects: {"image": "base64_string"}
    Returns: pose analysis results
    """
    try:
        if "image" not in data:
            raise HTTPException(status_code=400, detail="Missing 'image' field")
        
        # Decode base64 image
        image_data = base64.b64decode(data["image"])
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        # Analyze pose
        result = analyzer.analyze_pose(image)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "pose-analysis"}

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    reload = os.getenv("RELOAD", "0") == "1"
    print("🚀 Starting AI Fitness Trainer - Pose Analysis Service")
    print(f"📍 Running on: http://localhost:{port}")
    print("🔗 Connects to main app on: http://localhost:3000")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        reload=reload,
        log_level="info"
    )
