#!/usr/bin/env python3
"""
CLI wrapper for cat detector
Called by Node.js service to detect Hana in photos/videos

Usage:
    python cat_detector_cli.py <photo_path> <model_path>

Output:
    JSON to stdout with detection result
"""
import sys
import json
import time
from pathlib import Path

# Add parent directory to path to import cat_detector
sys.path.insert(0, str(Path(__file__).parent))

try:
    from cat_detector import CatDetector
except ImportError:
    # Fallback if cat_detector not found
    print(json.dumps({
        "error": "cat_detector module not found",
        "class": "no_cat",
        "confidence": 0.0,
        "probabilities": {}
    }))
    sys.exit(1)

def main():
    if len(sys.argv) < 3:
        print(json.dumps({
            "error": "Usage: python cat_detector_cli.py <photo_path> <model_path>",
            "class": "no_cat",
            "confidence": 0.0,
            "probabilities": {}
        }))
        sys.exit(1)
    
    photo_path = sys.argv[1]
    model_path = sys.argv[2]
    
    try:
        # Check if file exists
        if not Path(photo_path).exists():
            raise FileNotFoundError(f"File not found: {photo_path}")
        
        # Load detector
        detector = CatDetector(model_path=model_path)
        
        # Detect
        start_time = time.time()
        
        # Check if video or image
        video_extensions = ['.h264', '.mp4', '.avi', '.mov']
        is_video = Path(photo_path).suffix.lower() in video_extensions
        
        if is_video:
            # Video analysis - check multiple frames with 50% threshold
            result = detector.analyze_video(photo_path, sample_rate=15, confidence_threshold=0.5)
            
            # Rule: If ANY frame shows ≥50% Hana, classify entire video as Hana
            # hana_detected = True means at least 1 frame had ≥50% confidence
            detection_result = {
                "class": "hana" if result['hana_detected'] else "no_cat",
                "confidence": result['max_confidence'],  # Max confidence from Hana frames
                "probabilities": {
                    "hana": result['max_confidence'],
                    "no_cat": 1.0 - result['max_confidence']
                },
                "video_analysis": {
                    "hana_percentage": result['hana_percentage'],
                    "duration": result['duration_seconds'],
                    "frames_analyzed": result['analyzed_frames']
                }
            }
        else:
            # Image analysis with 50% threshold
            import cv2
            frame = cv2.imread(photo_path)
            if frame is None:
                raise ValueError(f"Cannot read image: {photo_path}")
            
            result = detector.predict_frame(frame)
            hana_prob = result['probabilities'].get('hana', 0.0)
            
            detection_result = {
                "class": "hana" if hana_prob > 0.5 else "no_cat",
                "confidence": hana_prob,  # Always show hana probability
                "probabilities": result['probabilities']
            }
        
        detection_time = (time.time() - start_time) * 1000  # Convert to ms
        detection_result['detection_time_ms'] = round(detection_time, 2)
        
        # Output JSON
        print(json.dumps(detection_result))
        sys.exit(0)
        
    except Exception as e:
        # Error handling
        print(json.dumps({
            "error": str(e),
            "class": "no_cat",
            "confidence": 0.0,
            "probabilities": {}
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()
