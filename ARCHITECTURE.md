# 🐱 Hana Cat Detection System Architecture

## 📊 Complete Data Flow

```
[Arduino at Home]  →  [MQTT Cloud]  →  [Pi at School]  →  [Your Dashboard]
     PIR Sensor         (Internet)       Camera + ML       (Web Browser)
```

---

## 🔄 Step-by-Step Process

### **Step 1: Motion Detection** (Arduino at Home)
```
PIR Sensor → Arduino → WiFi → MQTT Cloud (broker.hivemq.com)
```

**What happens:**
1. Cat walks past PIR sensor
2. Arduino detects HIGH signal on pin 2
3. Arduino publishes MQTT message to `hana/motion/detected`:
   ```json
   {"sensor":"PIR","location":"home","timestamp":12345}
   ```
4. LED blinks once (visual feedback)

**Communication Protocol: MQTT**
- **Why MQTT?** Lightweight, perfect for IoT, works over internet
- **Cloud Broker:** broker.hivemq.com (free public MQTT server)
- Arduino publishes → Cloud stores → Pi subscribes and receives

---

### **Step 2: Pi Receives Signal** (Pi at School)
```
MQTT Cloud → Pi Node.js Server (mqttService.js)
```

**What happens:**
1. Pi's MQTT client is ALWAYS listening to `hana/motion/detected`
2. When message arrives, `mqttService.js` triggers workflow
3. Calls `handleMotionDetection(io)` function

**Code Location:** `server/services/mqttService.js`

---

### **Step 3: Camera Capture** (Pi at School)
```
Pi → rpicam-still command → Save photo to filesystem
```

**What happens:**
1. Pi runs command: `rpicam-still -o /home/tian/cat_photos/cat_1736345678.jpg`
2. Photo saved as **JPEG file** (not in database!)
3. Returns file path: `/home/tian/cat_photos/cat_1736345678.jpg`

**File Storage:**
```
~/cat_photos/
  ├── cat_1736345678.jpg  (1.5 MB)
  ├── cat_1736346123.jpg  (1.8 MB)
  └── cat_1736347890.jpg  (1.2 MB)
```

**Code Location:** `server/services/cameraService.js`

---

### **Step 4: ML Analysis** (Pi at School)
```
Photo file → Python ML model → Analysis result (JSON)
```

**What happens:**
1. Pi calls Python script: `python3 analyze_cat.py /path/to/photo.jpg`
2. Python script:
   - Loads trained model from `ml_models/hana_model.pkl`
   - Extracts color histogram from photo
   - Compares with Hana's color profile
   - Returns result:
   ```json
   {
     "isHana": true,
     "confidence": 0.87,
     "colorFeatures": {
       "dominantColor": "#E5D4B5",
       "saturation": 0.42
     }
   }
   ```

**Model Training (Done on Your Laptop, NOT Pi):**
```
1. Create folder: ml_models/
2. Put 40 Hana photos in: ml_models/training_data/hana/
3. Put 20 other cat photos in: ml_models/training_data/other/
4. Run: python3 train_model.py
5. Saves: ml_models/hana_model.pkl (< 1 MB)
6. Copy model to Pi: scp hana_model.pkl tian@100.82.69.79:~/H4.PI/ml_models/
```

**Code Location:** `server/services/catDetectionService.js` (calls Python)

---

### **Step 5: Save to Database** (Pi at School)
```
Analysis result → SQLite database (save metadata, NOT photo itself!)
```

**What happens:**
1. Pi saves detection record to database:

**Database Schema:**
```sql
-- Table: detections
CREATE TABLE detections (
  id INTEGER PRIMARY KEY,              -- Auto-increment ID
  timestamp DATETIME,                   -- When detected (e.g., "2026-01-08 14:30:45")
  is_hana BOOLEAN,                      -- true/false
  confidence REAL,                      -- 0.87 (87%)
  photo_path TEXT,                      -- "/home/tian/cat_photos/cat_1736345678.jpg"
  color_features TEXT                   -- JSON string of color data
);

-- Table: statistics
CREATE TABLE statistics (
  date DATE PRIMARY KEY,                -- "2026-01-08"
  hana_visits INTEGER,                  -- 5 visits today
  other_visits INTEGER                  -- 2 other cats today
);
```

**Example Database Record:**
```json
{
  "id": 42,
  "timestamp": "2026-01-08 14:30:45",
  "is_hana": true,
  "confidence": 0.87,
  "photo_path": "/home/tian/cat_photos/cat_1736345678.jpg",
  "color_features": "{\"dominantColor\":\"#E5D4B5\",\"saturation\":0.42}"
}
```

**Database Location:**
```
~/H4.PI/data/cat_detections.db  (SQLite file)
```

**Code Location:** `server/services/databaseService.js`

---

### **Step 6: Broadcast to Dashboard** (Real-time Update)
```
Pi → WebSocket → Browser Dashboard (React app)
```

**What happens:**
1. Pi emits WebSocket event: `io.emit('cat-detection', {...})`
2. Your browser (dashboard) receives update **instantly**
3. Dashboard shows:
   - "🐱 Hana detected at 14:30 (87% confidence)"
   - Photo thumbnail (fetched from `/cat-photos/cat_1736345678.jpg`)
   - Updated statistics graph

**Communication Protocol: WebSocket**
- **Why WebSocket?** Real-time, bidirectional, perfect for live updates
- Pi server broadcasts → All connected browsers receive instantly
- Like a live TV feed - no need to refresh page!

**Code Location:** `server/services/mqttService.js` (line 50-60)

---

## 🗂️ Data Storage Strategy

### **Photos (Filesystem):**
```
~/cat_photos/
  └── cat_1736345678.jpg  (actual JPEG file)
```
- **Why filesystem?** Photos are 1-2 MB each, too big for database
- Database only stores the **path**: `/home/tian/cat_photos/cat_1736345678.jpg`
- Dashboard fetches photo via URL: `http://100.82.69.79/cat-photos/cat_1736345678.jpg`

### **Metadata (SQLite Database):**
```
~/H4.PI/data/cat_detections.db
```
- **Why database?** Fast queries, statistics, search by date/confidence
- Stores: timestamp, is_hana, confidence, photo_path (NOT the photo itself!)
- Small size: 10 MB even with 10,000 records

### **ML Model (Filesystem):**
```
~/H4.PI/ml_models/hana_model.pkl  (< 1 MB)
```
- Trained on your laptop, copied to Pi
- Loaded once on server startup (cached in memory)

---

## 📁 Project Folder Structure

```
H4.PI/
├── server/
│   ├── server.js                    (Main entry point)
│   ├── routes/
│   │   ├── webhook.js               (GitHub auto-deploy)
│   │   └── api.js                   (REST API endpoints)
│   ├── services/
│   │   ├── mqttService.js           (MQTT subscriber)
│   │   ├── cameraService.js         (Camera control)
│   │   ├── catDetectionService.js   (ML analysis)
│   │   ├── databaseService.js       (SQLite operations)
│   │   └── systemStats.js           (CPU/memory stats)
│   └── websocket/
│       └── statsSocket.js           (WebSocket broadcasting)
│
├── ml_models/                       (⚠️ CREATE THIS FOLDER)
│   ├── hana_model.pkl               (Trained model - copy from laptop)
│   ├── train_model.py               (Training script - run on laptop)
│   ├── analyze_cat.py               (Analysis script - runs on Pi)
│   └── training_data/               (Photos for training)
│       ├── hana/                    (40 Hana photos)
│       └── other/                   (20 other cat photos)
│
├── data/
│   ├── cat_detections.db            (SQLite database - auto-created)
│   └── README.md                    (Database documentation)
│
├── Arduino/
│   └── cat_detector/
│       ├── cat_detector.ino         (Arduino code)
│       ├── config.h                 (WiFi credentials - git-ignored)
│       └── config.example.h         (Template)
│
└── dashboard/                       (React frontend)
    └── src/
        └── components/
            └── CatDetections.tsx    (⚠️ CREATE THIS COMPONENT)
```

---

## 🚀 Setup Checklist

### **On Pi (SSH required):**
```bash
# 1. Install Node.js dependencies
cd ~/H4.PI/server
npm install mqtt sqlite3

# 2. Create folders
mkdir -p ~/cat_photos
mkdir -p ~/H4.PI/ml_models

# 3. Database will auto-create on first run (no manual setup needed!)

# 4. Restart server
pm2 restart server
pm2 logs server  # Watch for "✅ Database connected" and "🦟 MQTT connected"
```

### **On Your Laptop (Windows PowerShell):**
```powershell
# 1. Create ML training script (Python)
# We'll create this next!

# 2. Train model with Hana photos
python train_model.py

# 3. Copy model to Pi
scp ml_models/hana_model.pkl tian@100.82.69.79:~/H4.PI/ml_models/

# 4. Push code to GitHub (auto-deploys via webhook)
git add .
git commit -m "Add cat detection system"
git push origin main
```

### **On Arduino (at home):**
```cpp
// 1. Create config.h with your WiFi credentials
// 2. Upload cat_detector.ino to Arduino
// 3. Watch Serial Monitor for "✅ System Ready!"
// 4. Unplug and deploy at cat entrance
```

---

## 🔍 How to Debug Each Part

### **Test 1: Arduino → MQTT Cloud**
```bash
# On laptop, subscribe to MQTT to see Arduino messages
mqtt-cli sub -h broker.hivemq.com -t "hana/motion/detected" -t "hana/arduino/status"
# Wave hand at PIR sensor → Should see JSON message
```

### **Test 2: MQTT Cloud → Pi**
```bash
# SSH to Pi, watch logs
ssh tian@100.82.69.79
pm2 logs server
# Wave hand at PIR → Should see "📨 MQTT message from hana/motion/detected"
```

### **Test 3: Pi Camera**
```bash
# Manual test
rpicam-still -o ~/test_capture.jpg
ls -lh ~/test_capture.jpg  # Should see ~1-2 MB file
```

### **Test 4: Database**
```bash
# Check database records
sqlite3 ~/H4.PI/data/cat_detections.db
> SELECT * FROM detections ORDER BY timestamp DESC LIMIT 5;
> .quit
```

### **Test 5: WebSocket → Dashboard**
```javascript
// Open browser console on dashboard, paste this:
const socket = io('http://100.82.69.79:5000');
socket.on('cat-detection', (data) => console.log('Detection:', data));
// Trigger Arduino → Should see log in console
```

---

## ⏱️ Timeline Estimate

| Task | Time | Complexity |
|------|------|------------|
| Install npm packages on Pi | 5 min | Easy |
| Create ML training script | 30 min | Medium |
| Train model with 40 photos | 2 min | Easy |
| Copy model to Pi | 1 min | Easy |
| Upload Arduino code | 5 min | Easy |
| Test end-to-end workflow | 15 min | Medium |
| Create dashboard component | 1 hour | Medium |
| **Total** | **~2 hours** | - |

---

## 🎯 Next Steps

**Ready to proceed? I can help you with:**
1. ✅ Create Python ML training script (train_model.py)
2. ✅ Create Python analysis script (analyze_cat.py)
3. ✅ Create dashboard component (CatDetections.tsx)
4. ✅ Test the entire workflow

**Which would you like to do first?**
