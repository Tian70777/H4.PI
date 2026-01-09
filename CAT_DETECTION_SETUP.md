# Cat Detection System - Complete Setup Guide

## System Overview

```
Arduino (Home) → MQTT → Pi (School) → Camera → ML → Dashboard
```

##System Requirements

**Arduino:**
- ESP32 or Arduino UNO R4 WiFi
- PIR sensor
- LED
- Power supply

**Raspberry Pi:**
- Pi 8GB (sufficient for basic ML)
- Pi Camera Rev 1.3 (CSI connected)
- Mosquitto MQTT broker
- Node.js server (already installed)

---

## Installation Steps

### 1. Install Dependencies on Pi

```bash
ssh -i $env:USERPROFILE\.ssh\id_ed25519_pi tian@100.82.69.79

# Install Mosquitto MQTT broker
sudo apt update
sudo apt install mosquitto mosquitto-clients
sudo systemctl enable mosquitto
sudo systemctl start mosquitto

# Install Node.js dependencies
cd ~/H4.PI/server
npm install mqtt sqlite3

# Create data directory
mkdir -p ~/H4.PI/data
mkdir -p ~/cat_photos

# Test camera
libcamera-hello --list-cameras
libcamera-still -o test.jpg
```

### 2. Upload Arduino Code

1. Copy `cat_detector.ino` to Arduino IDE
2. Create `config.h` from `config.example.h`
3. Fill in WiFi credentials
4. Change MQTT_SERVER to Pi's **Tailscale IP**: `100.82.69.79`
5. Upload to Arduino

### 3. Train ML Model (Optional - for better accuracy)

**Where to train:** Your laptop (faster) or Pi (slower but works)

```bash
# On laptop or Pi
cd ~/H4.PI/ml_training

# Create Python script for training
python3 train_hana_model.py --photos ~/hana_photos --output hana_model.pkl
```

**Training process:**
1. Load 40 Hana photos
2. Extract color histograms (HSV space)
3. Train k-NN classifier
4. Save model to disk

---

## Is Pi Powerful Enough? (Pi 8GB 够强吗？)

✅ **YES for your use case:**
- Simple color-based ML: Very fast (< 100ms per image)
- Dashboard + WebSocket: Low CPU usage
- Camera capture: Native hardware support
- SQLite database: Minimal overhead

❌ **NOT enough for:**
- Complex CNN face recognition (ResNet, YOLO)
- Real-time video processing
- Multiple simultaneous ML models

**Your color distribution approach is SMART!** 你的颜色分布方法很聪明！
- Much faster than face detection
- Works with cat viewed from above
- Pi handles it easily

---

## Complete Workflow

### Arduino (Home):
```
PIR → Motion → LED blinks → Send MQTT
```

### Pi (School):
```
Receive MQTT → Capture photo → Analyze colors → 
Is Hana? → Save to DB → Update dashboard
```

### Dashboard:
- Real-time notifications when Hana detected
- Photo gallery
- Statistics: "Hana visited 12 times today"
- Graphs: Visit times, frequency

---

## Database Structure

**Stores:**
- All detection events (Hana + other cats)
- Photos paths
- Confidence scores
- Color features (for debugging)
- Daily statistics

**Allows:**
- "How many times did Hana visit this week?"
- "What time does Hana usually come?"
- "Show me all Hana photos from January 8"

---

## Next Steps

1. ✅ Push code to GitHub
2. ✅ Deploy to Pi (auto-deploy webhook will handle it!)
3. Install Mosquitto on Pi
4. Upload Arduino code
5. Test end-to-end
6. (Optional) Train better ML model

---

## Troubleshooting

**Arduino can't connect to MQTT:**
```bash
# On Pi, test Mosquitto
mosquitto_sub -h localhost -t 'hana/motion/detected' -v
```

**Pi camera not working:**
```bash
# Enable camera interface
sudo raspi-config
# Interface Options → Camera → Enable

# Test
libcamera-hello
```

**ML model too slow:**
- Use smaller images (640x480 instead of 1920x1080)
- Simplify color histogram (fewer bins)
- Cache model in memory (don't reload each time)

---

## Future Improvements

1. **Better ML model:** Use TensorFlow.js with pre-trained MobileNet
2. **Multiple cameras:** Track Hana in different rooms
3. **Motion tracking:** Record video clips when Hana visits
4. **Notifications:** Send push notification to your phone
5. **Feeding schedule:** Auto-dispense food when Hana arrives

**This is a professional edge computing + IoT + ML system!** 这是一个专业的边缘计算 + 物联网 + 机器学习系统！🚀
