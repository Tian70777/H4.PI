# Cat Detector: Monitoring Front Door Area Using PIR Triggered Video Capture and Machine Learning Classification

**IoT & Edge Computing Project**

**Course:** 4510 H4 DAKP  
**Supervisor:** David Svarrer  
**Name:** Tianzuo Wang  
**Date:** 15 January 2026

---

## 1. Introduction

Several cats visit my garden regularly, with one particular cat, "Hana", visiting very frequently. This project addresses a practical curiosity: **how often does Hana visit?**

The system combines motion detection, video capture, and machine learning classification. An Arduino microcontroller with two PIR sensors detects movement at the front door and publishes trigger events via MQTT to a cloud broker. A Raspberry Pi subscribes to these events and records a 5-second video clip upon each trigger. Selected frames are analyzed using a TensorFlow Lite model trained to distinguish Hana from other cats based on coat patterns. Results are stored in a local SQLite database (classification result, confidence score, timestamp, sensor information, video path) and displayed on a web dashboard accessible via Tailscale VPN.

---

## 2. Deployment Context and Constraints

### 2.1 Physical Environment

The detection takes place in a narrow stone walkway between the main house and a storage shed, leading to the front door. The shed has a window facing the walkway, providing an ideal observation point for monitoring while keeping electronics sheltered.

**Physical Constraints:**
- **Outdoor weather exposure:** PIR sensors mounted on exterior wooden wall (cardboard-protected) face rain, snow, wind, and humidity
- **Glass barrier:** Pi Camera records through window glass, causing reflections from device LEDs and reduced image contrast. Rain and condensation significantly degrade video quality
- **Sensor placement:** PIR sensors optimally trigger when cats approach the door (forward direction), but miss cats that pass the door before triggering the sensor (lateral movement)
- **Weak Wi-Fi:** Limited signal strength in shed affects Arduino connectivity, causing frequent disconnections

**Technical Constraints:**
- **No IR capability:** Pi Camera v1.3 lacks night vision; low-light footage is unusable for classification
- **Video format:** Raw H.264 output requires conversion to MP4 for browser playback
- **Limited training data:** Model trained on only 243 images (151 Hana, 92 no_Hana)
- **High camera angle:** May capture incomplete coat patterns, reducing classification accuracy

---

## 3. Project Goals and Scope

**Objectives:**
1. Detect movement near the front door reliably using PIR sensors
2. Capture 5-second video clips upon motion detection
3. Classify whether Hana is present using ML with confidence score
4. Store results in SQLite database with metadata
5. Display server status, Arduino status, and classification results with video playback on a real-time dashboard

**Limitations:**
- Camera placed indoors (shed) pointing through window due to weather protection needs
- PIR sensors require weatherproofing (plastic film wrapping)
- No low-light detection capability
- Model training data limited to available photos
- Motion-based triggering only (cat sitting still may not trigger detection)

---

## 4. System Architecture

### 4.1 Component Overview

**Hardware:**
- **Arduino UNO R4 WiFi** with two PIR sensors (GPIO pins 2 and 4)
- **Raspberry Pi 8GB** running Node.js server, MQTT broker, and Python ML inference
- **Pi Camera v1.3** (CSI-connected) for video capture

**Software:**
- **Arduino firmware** (C++): PIR monitoring, WiFi connectivity, MQTT publishing
- **MQTT Broker** (HiveMQ cloud): Message queue for motion events
- **Node.js Server** (Express + Socket.io): Event handling, service orchestration, WebSocket communication
- **Python ML Service** (TensorFlow Lite): Video frame analysis using trained CNN model
- **SQLite Database**: Event logging and retrieval
- **React Dashboard** (TypeScript + Vite): Real-time visualization

### 4.2 Data Flow

```
1. PIR Sensor → Arduino (motion detection)
2. Arduino → MQTT Cloud (hana/motion/detected)
3. Raspberry Pi ← MQTT (subscription trigger)
4. Raspberry Pi → Pi Camera (5-second video recording at 720p, 15fps)
5. Video file → Python script (TFLite model inference on sampled frames)
6. Analysis result → SQLite (save detection with metadata)
7. WebSocket → Dashboard (real-time update with video playback)
```

**Communication Protocol:**
- **MQTT** for Arduino-to-Pi messaging (lightweight, internet-capable)
- **WebSocket** for Pi-to-Dashboard real-time updates
- **REST API** for dashboard data retrieval and historical queries

---

## 5. Implementation

### 5.1 System Setup and Configuration

#### 5.1.1 Raspberry Pi Configuration as Web Server

The Raspberry Pi 4 serves as the central processing unit, hosting the Node.js server, MQTT subscriber, ML inference service, and web dashboard.

**A) Choosing Ubuntu Version**

For this project, **Ubuntu Server 24.04 LTS (64-bit ARM)** was selected for:
- **Server vs Desktop:** Headless operation requires no GUI; Server edition is lighter and optimized for SSH/services
- **LTS (Long-Term Support):** Provides stability and extended support for production deployment
- **ARM64:** Pi 4B fully supports 64-bit architecture for better performance

**B) Flash Ubuntu Server to SD Card**

Using **Raspberry Pi Imager** (recommended):

1. Download and install Raspberry Pi Imager
2. Select **Other general-purpose OS** → **Ubuntu Server** (64-bit LTS)
3. Choose storage (SD card)
4. Click settings icon (⚙) to preconfigure:
   - Hostname: `TianServer01`
   - Username: `tian` / Password: (set your password)
   - Enable SSH (important!)
   - Configure Wi-Fi if needed (SSID + password)
5. Write image → Insert SD into Pi → Power on

**C) Initial SSH Connection**

Find Pi IP address on your router, then connect from Windows PowerShell:

```powershell
# Connect to Pi (replace with actual IP)
ssh tian@10.61.3.188
```

First-time connection prompts:
- `Are you sure you want to continue connecting?` → Type `yes`
- Enter password (may be forced to change on first login)
- Successfully connected when prompt shows: `tian@TianServer01:~$`

**D) Network Configuration (Enable Ethernet)**

If Pi cannot reach internet after SSH connection (e.g., `ping 8.8.8.8` fails), configure Ethernet interface:

```bash
# Check network status
ip -4 a                    # Shows interfaces and IPs
ip route                   # Should show "default via..." (missing if no internet)

# Edit netplan configuration
sudo nano /etc/netplan/50-cloud-init.yaml
```

Add Ethernet configuration (keep existing Wi-Fi if desired):

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: true          # Enable DHCP for Ethernet
  wifis:
    wlan0:
      dhcp4: true
      # ... existing Wi-Fi config
```

Save (`Ctrl+O`, Enter) and exit (`Ctrl+X`), then apply:

```bash
sudo netplan apply

# Verify connection
ip route                   # Should show: "default via 10.61.2.1 dev eth0"
ping -c 2 8.8.8.8         # Test internet connectivity
```

**E) System Update and Security**

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Enable automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

**F) SSH Key Authentication Setup**

Replace password authentication with SSH keys for better security.

**Step 1: Generate SSH key pair on Windows (PowerShell):**

```powershell
# Create new Ed25519 key with passphrase
ssh-keygen -t ed25519 -a 64 -f $env:USERPROFILE\.ssh\id_ed25519_pi -C "tian@pi"
```

- Enter a strong passphrase when prompted (protects private key)
- Creates two files:
  - Private key: `C:\Users\<you>\.ssh\id_ed25519_pi` (keep secret!)
  - Public key: `C:\Users\<you>\.ssh\id_ed25519_pi.pub` (safe to copy)

**Step 2: Copy public key to Pi:**

```powershell
# View public key
type $env:USERPROFILE\.ssh\id_ed25519_pi.pub

# Copy entire line starting with "ssh-ed25519..."
```

On Pi:

```bash
# Create SSH directory and authorized_keys file
mkdir -p ~/.ssh
nano ~/.ssh/authorized_keys

# Paste public key on a new line
# Save: Ctrl+O, Enter
# Exit: Ctrl+X

# Set correct permissions (required for security)
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

**Step 3: Test key-based login from Windows:**

```powershell
# Login using specific key (will ask for passphrase, not Pi password)
ssh -i $env:USERPROFILE\.ssh\id_ed25519_pi tian@10.61.3.188
```

**G) SSH Agent (Optional: Avoid Repeated Passphrase Entry)**

Configure Windows ssh-agent to remember key passphrase:

```powershell
# Open PowerShell as Administrator
Set-Service ssh-agent -StartupType Automatic
Start-Service ssh-agent

# Add key to agent (enter passphrase once)
ssh-add $env:USERPROFILE\.ssh\id_ed25519_pi

# Verify key is loaded
ssh-add -l
```

Now SSH connections no longer prompt for passphrase until Windows restart. After reboot, run `ssh-add` again to reload the key.

**H) Install Application Dependencies**

Install base runtimes, libraries, and system utilities required to run the application:

```bash
# Install Node.js runtime (v18.x) for server and dashboard
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python runtime and ML dependencies
sudo apt install -y python3-pip python3-opencv
pip3 install tensorflow tflite-runtime numpy opencv-python

# Install FFmpeg (video conversion utility)
sudo apt install -y ffmpeg

# Install PM2 (Node.js process manager)
sudo npm install -g pm2

# Install Nginx (web server / reverse proxy)
sudo apt install -y nginx

# Install Git (for webhook auto-deployment)
sudo apt install -y git
```

**Note:** These are the foundational tools. Section 5.1.3 describes how they're used as software components in the system architecture.

**Tailscale VPN Configuration:**
```bash
# Install Tailscale for secure remote access
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# Enable Tailscale on boot
sudo systemctl enable tailscaled
```

**Nginx Configuration:**
Nginx serves the React dashboard and provides access to video files:
```nginx
server {
    listen 80;
    server_name localhost;
    
    # Serve React dashboard
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Serve video files
    location /videos/ {
        alias /home/tian/cat_videos/;
        autoindex on;
    }
    
    # API endpoints
    location /api/ {
        proxy_pass http://localhost:3000;
    }
}
```

**GitHub Auto-Deployment with Webhook:**
```bash
# Install ngrok for webhook tunnel
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-arm64.tgz
sudo tar xvzf ngrok-v3-stable-linux-arm64.tgz -C /usr/local/bin

# Configure ngrok authentication
ngrok config add-authtoken YOUR_TOKEN_HERE

# Start ngrok tunnel (run in background)
ngrok http 3000 &

# Add webhook endpoint to GitHub repository settings:
# Payload URL: https://YOUR_NGROK_URL/webhook/github
# Content type: application/json
# Events: Just the push event
```

The webhook listener in `server/routes/webhook.js` automatically pulls latest changes and restarts services when code is pushed to GitHub.

**PM2 Process Management:**
```bash
# Start server with PM2
cd /home/tian/H4.PI/server
pm2 start server.js --name cat-detector-server

# Start dashboard
cd /home/tian/H4.PI/dashboard
pm2 start "npm run dev" --name cat-detector-dashboard

# Save PM2 configuration
pm2 save

# Enable PM2 startup on boot
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u tian --hp /home/tian
```

#### 5.1.2 Hardware Components

**Arduino UNO R4 WiFi:**
- Microcontroller with built-in WiFi connectivity
- Two GPIO pins (2, 4) connected to PIR sensors
- Powered via 5V USB from Pi or separate power adapter
- Configured with HiveMQ cloud MQTT credentials

**PIR Motion Sensors (HC-SR501):**
- Two sensors positioned at different heights
- Sensitivity adjusted via onboard potentiometer
- Weatherproofed with plastic film wrapping
- 3-wire connection: VCC (5V), GND, OUT (digital signal)

**Raspberry Pi 4 (8GB):**
- Quad-core ARM Cortex-A72 processor
- Runs server processes, MQTT client, and ML inference
- Connected to network via WiFi with TP-Link RE305 extender for improved signal
- Hosts SQLite database and video storage

**Pi Camera v1.3:**
- 5MP resolution, CSI interface
- Mounted in shed window facing walkway
- Records at 720p, 15fps for storage efficiency
- Limited low-light performance (no IR capability)

**TP-Link RE305 Wi-Fi Extender:**
- Improves WiFi signal strength in shed area
- Reduces Arduino disconnection frequency
- Provides more stable MQTT connection

#### 5.1.3 Software Components

**MQTT Publisher (Arduino):**
- Firmware written in C++ using Arduino IDE
- Libraries: `WiFiS3.h`, `ArduinoMqttClient.h`
- Publishes to topics: `hana/motion/detected`, `hana/arduino/status`
- Implements automatic WiFi reconnection with retry logic

**MQTT Subscriber (Node.js):**
- `mqttService.js` connects to HiveMQ cloud broker
- Subscribes to motion events and triggers video capture
- Forwards Arduino status updates to dashboard via WebSocket

**Video Conversion (FFmpeg):**
- Converts H.264 raw video to MP4 container format
- Command: `ffmpeg -i input.h264 -c copy output.mp4`
- Preserves video codec (copy mode) for fast conversion
- Required for browser playback compatibility

**TensorFlow Lite Inference Service:**
- Python script `cat_detector_cli.py` performs frame-by-frame analysis
- Model: MobileNetV2-based CNN (4MB .tflite file)
- Input: 224x224 RGB images, normalized to [-1, 1]
- Output: Binary classification (hana/no_hana) with confidence score

**SQLite Database:**
- Lightweight embedded database for detection logging
- Schema includes: timestamp, classification result, confidence, sensor data, video path
- Managed by `databaseService.js` with prepared statements
- Database file: `/home/tian/H4.PI/data/detections.db`

**PM2 Process Manager:**
- Keeps Node.js server and dashboard running continuously
- Automatic restart on crashes
- Startup-on-boot configuration for unattended operation
- Process monitoring and log management

**Tailscale VPN:**
- Provides secure, private network for remote access
- Dashboard accessible from anywhere via Tailscale IP
- No port forwarding or firewall configuration needed
- End-to-end encrypted tunnel

**Nginx Web Server:**
- Serves React dashboard as static files (production build)
- Reverse proxy for API endpoints and WebSocket connections
- Serves video files from `/home/tian/cat_videos/` directory
- Handles CORS and request routing

**Ngrok Tunnel:**
- Exposes local webhook endpoint to GitHub
- Required for GitHub webhook delivery to private network
- Provides HTTPS URL for webhook configuration
- Used exclusively for auto-deployment feature

### 5.2 Motion Detection (Arduino)

The Arduino continuously monitors two PIR sensors (door sensor on pin 2, window sensor on pin 4). Upon detecting motion, it publishes a JSON message to the MQTT topic `hana/motion/detected`:

```json
{
  "sensor1": true,
  "sensor2": false,
  "location": "sensor1",
  "timestamp": 1736345678
}
```

The Arduino also publishes heartbeat status messages every 30 seconds to `hana/arduino/status` for remote monitoring, including WiFi RSSI and IP address. The system implements automatic WiFi reconnection with continuous retry logic.

### 5.2 Video Capture (Raspberry Pi)

Upon receiving an MQTT trigger, the Node.js `mqttService.js` initiates video capture through `cameraService.js`. The service uses `rpicam-vid` (or `libcamera-vid` fallback) to record:
- **Resolution:** 1280x720 (720p)
- **Duration:** 5 seconds
- **Framerate:** 15 fps (storage-efficient)
- **Codec:** H.264 (hardware-accelerated)

Videos are saved to `/home/tian/cat_videos/` with ISO timestamp filenames. The service implements camera locking to prevent simultaneous recordings—if the camera is busy, subsequent triggers share the current recording.

Raw H.264 files are converted to MP4 containers using FFmpeg for browser compatibility:
```bash
ffmpeg -i input.h264 -c copy output.mp4
```

### 5.3 Machine Learning Classification

The Python script `cat_detector_cli.py` analyzes videos using a TensorFlow Lite MobileNetV2-based model. The process:

1. **Frame sampling:** Extract frames at 15fps intervals
2. **Preprocessing:** Resize to model input size, normalize to [-1, 1]
3. **Inference:** Run TFLite interpreter on each frame
4. **Aggregation:** Apply 50% confidence threshold; classify video as "Hana" if any frame exceeds threshold

The model outputs:
```json
{
  "class": "hana",
  "confidence": 0.87,
  "video_analysis": {
    "hana_percentage": 65.2,
    "frames_analyzed": 10,
    "duration": 5.0
  },
  "detection_time_ms": 1234.56
}
```

### 5.4 Data Persistence

The `databaseService.js` saves each detection to SQLite with the following schema:

**Table: `detections`**
- `id`: Auto-increment primary key
- `timestamp`: Detection time (ISO format)
- `is_hana`: Boolean (1=Hana detected, 0=no Hana)
- `confidence`: Float (0-1)
- `photo_path`: Video file path
- `sensor1`, `sensor2`: Which sensors triggered
- `location`: 'sensor1', 'sensor2', or 'both'

Database files are stored in `/home/tian/H4.PI/data/` and excluded from Git.

### 5.5 Dashboard

The React/TypeScript dashboard displays:
- **Real-time events:** New detections via WebSocket with live updates
- **Video playback:** In-browser MP4 streaming
- **Historical data:** Filterable detection log with date range
- **System status:** Arduino heartbeat (WiFi RSSI, IP), Pi server stats (CPU, RAM, temperature)
- **Statistics:** Daily visit counts and confidence distributions

The dashboard connects to the Pi server via Tailscale VPN for remote access.

---

## 6. Data Collection and Model Training

### 6.1 Dataset

The model was trained on:
- **151 images** of Hana (various poses, lighting conditions, angles)
- **92 images** of other cats for negative class

Total: **243 training images**

### 6.2 Training Approach

Due to the high camera angle (which often misses facial features), the model focuses on **coat pattern recognition** rather than facial features. Training was performed on a laptop using transfer learning:

1. **Base model:** MobileNetV2 (pre-trained on ImageNet)
2. **Fine-tuning:** Replace classification head, train on cat dataset
3. **Data augmentation:** Rotation, zoom, flip to increase effective dataset size
4. **Validation:** 20% holdout set
5. **Export:** Convert to TensorFlow Lite for Pi deployment

The TFLite model (`cat_detector_v1.tflite`) is ~4MB, enabling fast inference on Raspberry Pi.

---

## 7. Results and Performance

### 7.1 System Reliability

- **Motion detection:** PIR sensors reliably trigger on cat movement in forward direction (approaching door)
- **False triggers:** Lateral movement (cat passing door first) results in empty videos with "no cat" classification
- **Camera locking:** Prevents recording conflicts; subsequent triggers within 5 seconds share the current video

### 7.2 Classification Performance

- **Inference time:** ~1.2 seconds per video (10 frames analyzed)
- **Threshold:** 50% confidence threshold balances precision and recall
- **Accuracy limitations:** 
  - Low-light conditions produce unreliable results (camera limitation)
  - Rain/snow on window glass significantly degrades image quality
  - High camera angles may miss distinguishing coat patterns

### 7.3 Operational Challenges

1. **WiFi stability:** Arduino experiences frequent disconnections due to weak signal in shed. Implemented continuous reconnection logic with heartbeat monitoring
2. **Weather sensitivity:** Outdoor PIR sensors require better weatherproofing; current cardboard protection insufficient for long-term deployment
3. **Glass reflections:** LED indicators from Arduino and Pi reflect on window glass, occasionally visible in recordings
4. **Training data:** Limited dataset (243 images) constrains model generalization; additional data collection recommended

### 7.4 Dashboard Functionality

The web interface successfully provides:
- Real-time detection notifications with video playback
- Historical event browsing with filtering
- Arduino connectivity status (RSSI, IP, last heartbeat)
- Pi system health monitoring (CPU, RAM, temperature)

Remote access via Tailscale VPN enables monitoring from any location.

---

## 8. Conclusions and Future Work

This project successfully demonstrates an end-to-end IoT system combining edge devices (Arduino), edge computing (Raspberry Pi ML inference), and cloud connectivity (MQTT broker). The system achieves its primary goal of monitoring Hana's visits with reasonable accuracy under favorable conditions.

**Key achievements:**
- Functional motion-triggered video capture system
- Real-time ML classification on Raspberry Pi
- Remote monitoring dashboard with historical data
- Robust error handling and automatic reconnection

**Future improvements:**
1. **Hardware upgrades:**
   - Pi Camera with IR capability for night vision
   - Weatherproof enclosure for PIR sensors
   - Better WiFi solution (range extender or wired connection)

2. **Software enhancements:**
   - Expand training dataset (target: 500+ images per class)
   - Implement object tracking to distinguish "visit" vs "stay" behaviors
   - Add notification system (email/push alerts for Hana detection)
   - Optimize video storage (automatic cleanup of old recordings)

3. **Detection improvements:**
   - Multi-stage detection (coarse motion filter → fine ML classifier)
   - Time-based filtering to avoid duplicate detections
   - Confidence calibration based on lighting conditions

The project provides practical experience with IoT system design, edge ML deployment, distributed communication protocols, and full-stack development—valuable skills applicable to industrial IoT applications.

---

## References

- **TensorFlow Lite:** https://www.tensorflow.org/lite
- **MQTT Protocol:** https://mqtt.org/
- **Raspberry Pi Camera Documentation:** https://www.raspberrypi.com/documentation/computers/camera_software.html
- **MobileNetV2:** Sandler et al., "MobileNetV2: Inverted Residuals and Linear Bottlenecks"
- **HiveMQ Cloud:** https://www.hivemq.com/mqtt-cloud-broker/

---

## Appendix: System Specifications

**Arduino:**
- Board: Arduino UNO R4 WiFi
- Sensors: 2x HC-SR501 PIR Motion Sensors
- Power: 5V USB

**Raspberry Pi:**
- Model: Raspberry Pi 4B 8GB
- OS: Raspberry Pi OS (64-bit)
- Camera: Pi Camera v1.3 (5MP, CSI)
- Network: WiFi + Tailscale VPN

**Software Versions:**
- Node.js: v18.x
- Python: 3.11
- TensorFlow Lite: 2.15
- MQTT Broker: HiveMQ Cloud
- Dashboard: React 18 + TypeScript 5 + Vite 5
