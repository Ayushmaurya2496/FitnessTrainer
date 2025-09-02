"""
RTSP Camera pose detection
For IP cameras and security cameras
"""

import cv2
import mediapipe as mp

class RTSPPoseDetector:
    def __init__(self, camera_url=None):
        # Default RTSP URL (update as needed)
        self.camera_url = camera_url or "rtsp://admin:admin%40123@192.168.150.100:554/cam/realmonitor?channel=6&subtype=0"
        
        # Screen resolution settings
        self.SCREEN_WIDTH = 1280
        self.SCREEN_HEIGHT = 720
        
        # Initialize MediaPipe with improved accuracy
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=2,              # Heavy model for better accuracy
            enable_segmentation=True,
            min_detection_confidence=0.7,    # Increased from 0.5
            min_tracking_confidence=0.6      # Increased from 0.5
        )
        self.mp_draw = mp.solutions.drawing_utils
        
        # Initialize camera connection
        print(f"🔗 Connecting to camera: {self.camera_url}")
        self.cap = cv2.VideoCapture(self.camera_url)
        if not self.cap.isOpened():
            print("❌ Could not open RTSP stream. Check URL/credentials/network.")
    
    def start_detection(self):
        """Start real-time pose detection from RTSP stream"""
        print("🎥 Starting RTSP pose detection...")
        print("👋 Press 'q' to quit")
        
        try:
            while self.cap.isOpened():
                success, frame = self.cap.read()
                if not success:
                    print("❌ Frame not received... Check your camera URL or connection.")
                    break

                # Resize the frame
                frame = cv2.resize(frame, (self.SCREEN_WIDTH, self.SCREEN_HEIGHT))

                # Convert BGR to RGB for MediaPipe
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

                # Process the frame with MediaPipe pose
                result = self.pose.process(rgb_frame)

                # Draw landmarks and connections
                if result.pose_landmarks:
                    # Draw landmark points
                    for id, lm in enumerate(result.pose_landmarks.landmark):
                        h, w, _ = frame.shape
                        cx, cy = int(lm.x * w), int(lm.y * h)
                        cv2.circle(frame, (cx, cy), 3, (255, 0, 0), cv2.FILLED)
                    
                    # Draw pose connections
                    self.mp_draw.draw_landmarks(
                        frame, 
                        result.pose_landmarks, 
                        self.mp_pose.POSE_CONNECTIONS,
                        self.mp_draw.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=2),
                        self.mp_draw.DrawingSpec(color=(0, 0, 255), thickness=2)
                    )
                    
                    # Add accuracy feedback
                    self.display_feedback(frame, result.pose_landmarks)

                # Show the frame
                try:
                    cv2.namedWindow("AI Fitness Trainer - RTSP Pose Detection", cv2.WINDOW_NORMAL)
                    cv2.imshow("AI Fitness Trainer - RTSP Pose Detection", frame)
                except Exception as show_err:
                    print(f"Display error: {show_err}")
                    break

                # Exit on 'q' key press
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
        finally:
            # Cleanup
            try:
                if hasattr(self, 'cap'):
                    self.cap.release()
            except Exception:
                pass
            cv2.destroyAllWindows()
            print("👋 RTSP pose detection stopped")
    
    def display_feedback(self, frame, landmarks):
        """Display real-time feedback on frame"""
        try:
            # Get key landmarks
            left_shoulder = landmarks.landmark[self.mp_pose.PoseLandmark.LEFT_SHOULDER]
            right_shoulder = landmarks.landmark[self.mp_pose.PoseLandmark.RIGHT_SHOULDER]
            left_hip = landmarks.landmark[self.mp_pose.PoseLandmark.LEFT_HIP]
            right_hip = landmarks.landmark[self.mp_pose.PoseLandmark.RIGHT_HIP]
            
            # Calculate posture metrics
            shoulder_diff = abs(left_shoulder.y - right_shoulder.y)
            hip_diff = abs(left_hip.y - right_hip.y)
            
            # Generate feedback
            feedback_messages = []
            accuracy = 100
            
            if shoulder_diff > 0.05:
                feedback_messages.append("Level shoulders")
                accuracy -= 20
            
            if hip_diff > 0.03:
                feedback_messages.append("Align hips")
                accuracy -= 15
            
            if not feedback_messages:
                feedback_messages.append("Excellent posture!")
            
            # Display feedback
            feedback = " | ".join(feedback_messages)
            color = (0, 255, 0) if accuracy > 80 else (0, 165, 255) if accuracy > 60 else (0, 0, 255)
            
            # Add text to frame
            cv2.putText(frame, feedback, (50, 50), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
            
            # Add accuracy score
            cv2.putText(frame, f"Accuracy: {max(0, accuracy)}%", (50, 90), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
            
            # Add connection status
            cv2.putText(frame, "RTSP Connected", (50, self.SCREEN_HEIGHT - 50), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                       
        except Exception as e:
            print(f"Feedback error: {e}")
    
    def test_connection(self):
        """Test RTSP connection without pose detection"""
        print(f"🧪 Testing RTSP connection: {self.camera_url}")
        
        cap = cv2.VideoCapture(self.camera_url)
        if not cap.isOpened():
            print("❌ Failed to connect to RTSP stream")
            return False
        
        ret, frame = cap.read()
        if ret:
            print("✅ RTSP connection successful")
            cv2.imshow("RTSP Test", frame)
            cv2.waitKey(3000)  # Show for 3 seconds
            cv2.destroyAllWindows()
        else:
            print("❌ Failed to read frame from RTSP stream")
        
        cap.release()
        return ret

if __name__ == "__main__":
    # You can customize the RTSP URL here
    detector = RTSPPoseDetector()
    
    # Test connection first
    if detector.test_connection():
        detector.start_detection()
    else:
        print("Please check your RTSP URL and network connection")
