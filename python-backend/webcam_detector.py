"""
Real-time webcam pose detection
Integrated version for main fitness trainer project
"""

import cv2
import mediapipe as mp

class WebcamPoseDetector:
    def __init__(self):
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
        self.cap = cv2.VideoCapture(0)
        self.cap.set(3, self.SCREEN_WIDTH)   # Width
        self.cap.set(4, self.SCREEN_HEIGHT)  # Height
        if not self.cap.isOpened():
            print('❌ Could not open webcam (index 0)')
    
    def start_detection(self):
        """Start real-time pose detection"""
        print("🎥 Starting webcam pose detection...")
        print("👋 Press 'q' to quit")
        
        try:
            while self.cap.isOpened():
                success, frame = self.cap.read()
                if not success:
                    print("❌ Failed to read from camera")
                    break

                # Resize to screen size
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
                    
                    # Add accuracy feedback (example)
                    self.display_feedback(frame, result.pose_landmarks)

                # Show the frame
                try:
                    cv2.namedWindow("AI Fitness Trainer - Pose Detection", cv2.WINDOW_NORMAL)
                    cv2.imshow("AI Fitness Trainer - Pose Detection", frame)
                except Exception as show_err:
                    print(f"Display error: {show_err}")
                    break

                # Exit on 'q' key press
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
        finally:
            
            try:
                if hasattr(self, 'cap'):
                    self.cap.release()
            except Exception:
                pass
            cv2.destroyAllWindows()
            print("👋 Pose detection stopped")
    
    def display_feedback(self, frame, landmarks):
        """Display real-time feedback on frame"""
        try:
            # Get key landmarks
            left_shoulder = landmarks.landmark[self.mp_pose.PoseLandmark.LEFT_SHOULDER]
            right_shoulder = landmarks.landmark[self.mp_pose.PoseLandmark.RIGHT_SHOULDER]
            
            # Calculate shoulder alignment
            shoulder_diff = abs(left_shoulder.y - right_shoulder.y)
            
            # Display feedback
            if shoulder_diff > 0.05:
                feedback = "Straighten your shoulders"
                color = (0, 0, 255)  # Red
            else:
                feedback = "Good posture!"
                color = (0, 255, 0)  # Green
            
            # Add text to frame
            cv2.putText(frame, feedback, (50, 50), 
                       cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)
            
            # Add accuracy score
            accuracy = max(0, 100 - int(shoulder_diff * 1000))
            cv2.putText(frame, f"Accuracy: {accuracy}%", (50, 100), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
                       
        except Exception as e:
            print(f"Feedback error: {e}")

if __name__ == "__main__":
    detector = WebcamPoseDetector()
    detector.start_detection()
