# Cat Detection Model Deployment Guide
*Deploy trained TensorFlow Lite model to Raspberry Pi*

---

## Overview

Your trained cat detection model is now integrated into the Node.js service. When Arduino detects motion:
1. Pi records 5-second video
2. Python script analyzes video with TFLite model
3. Result sent to dashboard via WebSocket

---

## Files Updated

### Server Service
- **`server/services/catDetectionService.js`**: Now calls Python script with your trained model
- Previously used mock data, now uses real ML detection

### Python Detection
- **`cat_detection/cat_detector.py`**: Your TensorFlow Lite detector class
- **`cat_detection/cat_detector_cli.py`**: CLI wrapper for Node.js to call
- **`cat_detection/models/cat_detector_v1.tflite`**: Your trained model
- **`cat_detection/models/class_names.txt`**: Class labels (hana, no_cat)

---

## Deployment Steps

### 1. Install Python Dependencies on Pi

```bash
# SSH into Pi
ssh tian@100.82.69.79

# Install required Python packages
pip3 install tensorflow opencv-python numpy

# Or use requirements.txt if you have one:
# cd ~/H4.PI/cat_detection
# pip3 install -r requirements.txt
```

### 2. Push Code to GitHub

```bash
# On laptop (Windows)
cd "C:\Users\twan\OneDrive - Danmarks Tekniske Universitet\Desktop\H4\4. PI"

git add server/services/catDetectionService.js
git add cat_detection/
git commit -m "feat: integrate trained TFLite model for cat detection"
git push origin main
```

### 3. Pull Updates on Pi

```bash
# On Pi
cd ~/H4.PI
git pull origin main

# Verify files are present
ls -la cat_detection/models/
# Should see: cat_detector_v1.tflite, class_names.txt
```

### 4. Test Python Script Manually

```bash
# Test with a sample video
cd ~/H4.PI/cat_detection

# Test the detector
python3 cat_detector_cli.py /home/tian/cat_videos/<some_video>.h264 models/cat_detector_v1.tflite

# Should output JSON like:
# {
#   "class": "hana",
#   "confidence": 0.87,
#   "probabilities": {"hana": 0.87, "no_cat": 0.13},
#   "video_analysis": {
#     "hana_percentage": 65.2,
#     "duration": 5.0,
#     "frames_analyzed": 10
#   },
#   "detection_time_ms": 1234.56
# }
```

### 5. Restart Server

```bash
# Restart PM2 service to load new code
pm2 restart pi-server

# Watch logs to see detection in action
pm2 logs pi-server --lines 50
```

---

## Testing the Integration

### 1. Trigger Motion Detection

Walk past Arduino PIR sensor to trigger recording.

### 2. Watch Server Logs

```bash
pm2 logs pi-server
```

**Expected output:**
```
🤖 Arduino: Motion detected at Door (Pin 2)
🎥 Recording 5-second video clip...
✅ Video recorded: /home/tian/cat_videos/cat_2026-01-14T...h264
🔍 Analyzing cat in video: /home/tian/cat_videos/cat_2026-01-14T...h264
✅ Analysis complete: Hana detected! (confidence: 87.3%)
✅ Detection saved with ID: 23
```

### 3. Check Dashboard

Dashboard should show:
- **Recent Detections** section updates with new photo
- Detection card shows:
  - `🐱 Hana!` or `❓ Unknown`
  - Confidence percentage
  - Timestamp

---

## Troubleshooting

### Issue: "python3: command not found"

**Solution:**
```bash
sudo apt update
sudo apt install python3 python3-pip
```

---

### Issue: "ModuleNotFoundError: No module named 'tensorflow'"

**Solution:**
```bash
# Install TensorFlow Lite (lighter than full TensorFlow)
pip3 install tflite-runtime

# OR install full TensorFlow (larger but includes all features)
pip3 install tensorflow
```

If using `tflite-runtime`, update [cat_detector.py](cat_detection/cat_detector.py#L8):
```python
# Change this line:
import tensorflow as tf

# To this:
import tflite_runtime.interpreter as tflite
# And update line 27:
self.interpreter = tflite.Interpreter(model_path=str(self.model_path))
```

---

### Issue: "Cannot open video: /path/to/video.h264"

**Possible causes:**
1. **OpenCV doesn't support H.264**: Install codecs
   ```bash
   sudo apt install ffmpeg libavcodec-extra
   ```

2. **Video file corrupted**: Check if file exists and has size > 0
   ```bash
   ls -lh /home/tian/cat_videos/
   ```

3. **Permissions issue**: Ensure Python can read video folder
   ```bash
   chmod 755 /home/tian/cat_videos
   ```

---

### Issue: Python script times out (30 seconds)

**Cause:** Model is too slow on Pi's CPU

**Solutions:**
1. **Increase timeout** in catDetectionService.js:
   ```javascript
   const { stdout, stderr } = await execPromise(command, {
     timeout: 60000 // Increase to 60 seconds
   });
   ```

2. **Reduce sample rate** (analyze fewer frames):
   ```javascript
   // In cat_detector_cli.py, line 63:
   result = detector.analyze_video(photo_path, sample_rate=30)
   // Higher sample_rate = faster (analyze every 30th frame)
   ```

3. **Use TFLite runtime** instead of full TensorFlow (faster):
   ```bash
   pip3 uninstall tensorflow
   pip3 install tflite-runtime
   ```

---

### Issue: Mock detection still appears ("Using fallback mock detection")

**Cause:** Python script failed but error was caught

**Debug steps:**
1. Check Python error in logs:
   ```bash
   pm2 logs pi-server | grep "Python stderr"
   ```

2. Run Python script manually to see full error:
   ```bash
   python3 cat_detection/cat_detector_cli.py /home/tian/cat_videos/<video>.h264 cat_detection/models/cat_detector_v1.tflite
   ```

3. Verify model file exists:
   ```bash
   ls -la cat_detection/models/
   ```

---

### Issue: "TypeError: 'NoneType' object is not subscriptable"

**Cause:** Video frame is None (OpenCV can't read frame)

**Solution:** Install proper video codecs:
```bash
sudo apt install libavcodec-dev libavformat-dev libswscale-dev
pip3 install opencv-python-headless  # Headless version for servers
```

---

## Performance Optimization

### Current Setup
- **Video:** 5 seconds, 1280x720, 15fps = ~75 frames
- **Sample rate:** Analyze every 15th frame = ~5 frames analyzed
- **Model:** MobileNetV2 TFLite (fast, optimized for mobile/edge)

### Tune for Speed vs Accuracy

| Setting | Speed | Accuracy | When to Use |
|---------|-------|----------|-------------|
| `sample_rate=5` | Slowest | Best | High-quality detection, Pi has time |
| `sample_rate=15` | **Balanced** | Good | **Recommended default** |
| `sample_rate=30` | Fast | OK | Need quick results, miss some frames |
| `sample_rate=60` | Fastest | Lower | Emergency, analyze only 1-2 frames |

Update in [cat_detector_cli.py](cat_detection/cat_detector_cli.py#L63):
```python
result = detector.analyze_video(photo_path, sample_rate=15)  # Change this number
```

---

## Model Updates

### How to Update Model

When you train a new version:

1. **Export new TFLite model** on laptop
2. **Copy to Pi:**
   ```bash
   # On laptop
   scp models/cat_detector_v2.tflite tian@100.82.69.79:~/H4.PI/cat_detection/models/
   
   # On Pi
   cd ~/H4.PI/cat_detection/models
   mv cat_detector_v1.tflite cat_detector_v1_backup.tflite
   mv cat_detector_v2.tflite cat_detector_v1.tflite
   ```

3. **Restart service:**
   ```bash
   pm2 restart pi-server
   ```

No code changes needed - service always uses `cat_detector_v1.tflite`!

---

## Monitoring Model Performance

### Check Detection Stats

```bash
# View recent detections with confidence
pm2 logs pi-server | grep "Analysis complete"

# Example output:
# ✅ Analysis complete: Hana detected! (confidence: 87.3%)
# ✅ Analysis complete: No Hana (confidence: 92.1%)
```

### SQLite Database Queries

```bash
# Connect to database
sqlite3 ~/H4.PI/data/cat_detections.db

# View all detections with confidence
SELECT id, timestamp, is_hana, confidence 
FROM detections 
ORDER BY timestamp DESC 
LIMIT 20;

# Calculate average confidence for Hana detections
SELECT AVG(confidence), MIN(confidence), MAX(confidence)
FROM detections 
WHERE is_hana = 1;
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Motion Detected                        │
│                      (Arduino PIR Sensor)                    │
└───────────────────────────┬─────────────────────────────────┘
                            │ MQTT
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Node.js Server (Pi)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  mqttService.js                                       │  │
│  │  ↓                                                    │  │
│  │  cameraService.capturePhoto()                        │  │
│  │  → Records 5-second H.264 video                      │  │
│  └──────────────────┬───────────────────────────────────┘  │
│                     │                                        │
│  ┌──────────────────▼───────────────────────────────────┐  │
│  │  catDetectionService.analyzeCat()                    │  │
│  │  ↓                                                    │  │
│  │  Calls: python3 cat_detector_cli.py video.h264       │  │
│  └──────────────────┬───────────────────────────────────┘  │
└───────────────────────┼─────────────────────────────────────┘
                        │ Shell exec
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Python Script (cat_detector_cli.py)             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  1. Load TFLite model (cat_detector_v1.tflite)       │  │
│  │  2. Read video with OpenCV                           │  │
│  │  3. Sample frames (every 15th frame)                 │  │
│  │  4. Run inference on each frame                      │  │
│  │  5. Aggregate results                                │  │
│  │  6. Output JSON to stdout                            │  │
│  └──────────────────┬───────────────────────────────────┘  │
└───────────────────────┼─────────────────────────────────────┘
                        │ JSON output
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              Node.js Server parses result                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  - isHana: true/false                                │  │
│  │  - confidence: 0.87                                  │  │
│  │  - percentage: 65.2% of frames have Hana            │  │
│  └──────────────────┬───────────────────────────────────┘  │
└───────────────────────┼─────────────────────────────────────┘
                        │
                        ├─> Save to SQLite database
                        │
                        └─> Broadcast to Dashboard (WebSocket)
                            ↓
                    ┌───────────────────┐
                    │  React Dashboard  │
                    │  Shows detection  │
                    │  🐱 Hana! (87.3%) │
                    └───────────────────┘
```

---

## Next Steps

1. **Deploy to Pi** following steps above
2. **Test with real motion** from Arduino sensor
3. **Monitor logs** to see model performance
4. **Tune sample_rate** if detection is too slow
5. **Collect false positives/negatives** to retrain model

---

## Resources

- [TensorFlow Lite Guide](https://www.tensorflow.org/lite/guide)
- [OpenCV on Raspberry Pi](https://docs.opencv.org/4.x/d7/d9f/tutorial_linux_install.html)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)

---

*For troubleshooting, check `pm2 logs pi-server` and [TROUBLESHOOTING.md](TROUBLESHOOTING.md)*
