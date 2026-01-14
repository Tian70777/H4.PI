"""
Real-time cat detection for H264 video files
Use this in your project to detect Hana in captured videos
"""
import cv2
import numpy as np
import tensorflow as tf
from pathlib import Path

class CatDetector:
    """Simple cat detector for your project"""
    
    def __init__(self, model_path="../models/cat_detector_v1.tflite"):
        """
        Initialize detector
        
        Args:
            model_path: Path to trained TFLite model
        """
        self.model_path = Path(model_path)
        
        if not self.model_path.exists():
            raise FileNotFoundError(f"Model not found: {model_path}")
        
        # Load TFLite model
        self.interpreter = tf.lite.Interpreter(model_path=str(self.model_path))
        self.interpreter.allocate_tensors()
        
        # Get input/output details
        self.input_details = self.interpreter.get_input_details()
        self.output_details = self.interpreter.get_output_details()
        
        # Get input shape
        self.input_shape = self.input_details[0]['shape'][1:3]  # (height, width)
        
        # Load class names
        class_names_path = self.model_path.parent / "class_names.txt"
        if class_names_path.exists():
            with open(class_names_path, 'r') as f:
                self.class_names = [line.strip() for line in f.readlines()]
        else:
            self.class_names = ['hana', 'no_cat']  # Default
        
        print(f"✅ Cat detector loaded!")
        print(f"   Model: {self.model_path.name}")
        print(f"   Classes: {self.class_names}")
    
    def preprocess_frame(self, frame):
        """Preprocess frame for model input"""
        # Resize
        resized = cv2.resize(frame, (self.input_shape[1], self.input_shape[0]))
        
        # Convert BGR to RGB
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
        
        # Normalize to [-1, 1] (MobileNetV2 preprocessing)
        normalized = (rgb.astype(np.float32) / 127.5) - 1.0
        
        # Add batch dimension
        return np.expand_dims(normalized, axis=0)
    
    def predict_frame(self, frame):
        """
        Predict if Hana is in frame
        
        Args:
            frame: OpenCV frame (BGR format)
            
        Returns:
            dict: {
                'class': 'hana' or 'no_cat',
                'confidence': float (0-1),
                'probabilities': dict of all class probabilities
            }
        """
        # Preprocess
        input_data = self.preprocess_frame(frame)
        
        # Run inference
        self.interpreter.set_tensor(self.input_details[0]['index'], input_data)
        self.interpreter.invoke()
        
        # Get output
        output = self.interpreter.get_tensor(self.output_details[0]['index'])[0]
        
        # Get prediction
        class_idx = np.argmax(output)
        confidence = float(output[class_idx])
        predicted_class = self.class_names[class_idx]
        
        # Build probabilities dict
        probabilities = {name: float(prob) for name, prob in zip(self.class_names, output)}
        
        return {
            'class': predicted_class,
            'confidence': confidence,
            'probabilities': probabilities
        }
    
    def analyze_video(self, video_path, confidence_threshold=0.6, sample_rate=30):
        """
        Analyze entire video and return summary
        
        Args:
            video_path: Path to H264/MP4 video file
            confidence_threshold: Minimum confidence to count detection
            sample_rate: Analyze every Nth frame (30 = ~1 per second at 30fps)
            
        Returns:
            dict: Video analysis summary
        """
        video_path = Path(video_path)
        if not video_path.exists():
            raise FileNotFoundError(f"Video not found: {video_path}")
        
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise ValueError(f"Cannot open video: {video_path}")
        
        # Video properties
        fps = int(cap.get(cv2.CAP_PROP_FPS))
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0
        
        # Analysis
        frame_count = 0
        analyzed_frames = 0
        hana_detections = 0
        max_confidence = 0.0
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Sample frames
            if frame_count % sample_rate == 0:
                result = self.predict_frame(frame)
                analyzed_frames += 1
                
                if result['class'] == 'hana' and result['confidence'] >= confidence_threshold:
                    hana_detections += 1
                    max_confidence = max(max_confidence, result['confidence'])
            
            frame_count += 1
        
        cap.release()
        
        # Calculate statistics
        hana_percentage = (hana_detections / analyzed_frames * 100) if analyzed_frames > 0 else 0
        
        return {
            'video_name': video_path.name,
            'duration_seconds': duration,
            'total_frames': total_frames,
            'analyzed_frames': analyzed_frames,
            'hana_detected': hana_detections > 0,
            'hana_detection_count': hana_detections,
            'hana_percentage': hana_percentage,
            'max_confidence': max_confidence,
            'fps': fps
        }
    
    def quick_check(self, video_path, confidence_threshold=0.6):
        """
        Quick check: Is Hana in this video? (Yes/No)
        
        Args:
            video_path: Path to video file
            confidence_threshold: Minimum confidence
            
        Returns:
            bool: True if Hana detected, False otherwise
        """
        result = self.analyze_video(video_path, confidence_threshold, sample_rate=15)
        return result['hana_detected']


# ============================================================================
# EXAMPLE USAGE FOR YOUR PROJECT
# ============================================================================

if __name__ == "__main__":
    # Initialize detector
    detector = CatDetector(model_path="../models/cat_detector_v1.tflite")
    
    print("\n" + "="*60)
    print("Example 1: Quick check - Is Hana in video?")
    print("="*60)
    
    video_file = input("Enter video path: ").strip().strip('"')
    
    if Path(video_file).exists():
        # Simple yes/no check
        is_hana_present = detector.quick_check(video_file)
        
        if is_hana_present:
            print("✅ Hana detected in video!")
        else:
            print("❌ Hana not detected in video")
        
        # Detailed analysis
        print("\n" + "="*60)
        print("Detailed Analysis:")
        print("="*60)
        
        analysis = detector.analyze_video(video_file)
        print(f"Video: {analysis['video_name']}")
        print(f"Duration: {analysis['duration_seconds']:.1f}s")
        print(f"Frames analyzed: {analysis['analyzed_frames']}")
        print(f"Hana detected: {analysis['hana_detected']}")
        print(f"Hana appearances: {analysis['hana_detection_count']} frames ({analysis['hana_percentage']:.1f}%)")
        print(f"Max confidence: {analysis['max_confidence']*100:.1f}%")
    else:
        print(f"❌ Video file not found: {video_file}")
