# IoT Dashboard Troubleshooting Guide
*Last Updated: January 9, 2026*

---

## Table of Contents
1. [Network & Connection Issues](#network--connection-issues)
2. [MQTT Communication Problems](#mqtt-communication-problems)
3. [Server Crashes & Missing Dependencies](#server-crashes--missing-dependencies)
4. [Dashboard UI Issues](#dashboard-ui-issues)
5. [Camera & Detection Workflow](#camera--detection-workflow)

---

## Network & Connection Issues

### Issue 1: Pi Not Accessible After Moving to Home Network
**Problem:** Raspberry Pi configured for school WiFi (Lab-ZBC), cannot connect at home

**Symptoms:**
- Cannot SSH into Pi
- Dashboard shows "Server Offline"
- Tailscale VPN not working

**Root Cause:** Pi's WiFi was only configured for school network

**Solution:**
```bash
# Method 1: Hotspot Trick (Temporary Access)
# 1. Create mobile hotspot with SSID "Lab-ZBC" and same password
# 2. Pi will connect automatically
# 3. SSH into Pi via hotspot IP

# Method 2: Add Home Network (Permanent Fix)
sudo nano /etc/netplan/50-cloud-init.yaml

# Add home WiFi configuration:
network:
  version: 2
  wifis:
    wlan0:
      access-points:
        "Lab-ZBC":
          password: "school_password"
        "YOUR_HOME_WIFI":
          password: "home_password"
      dhcp4: true

# Apply changes:
sudo netplan apply
```

**Verification:**
```bash
ip addr show wlan0  # Check IP address
ping google.com     # Test internet connectivity
```

**Key Learnings:**
- Netplan controls networking on Ubuntu, not wpa_supplicant
- Always configure backup WiFi networks before deployment
- Use Tailscale IP for remote access: `100.82.69.79`

---

### Issue 2: Dashboard Shows Wrong IP Address
**Problem:** Dashboard displays Tailscale VPN IP (100.x.x.x) instead of local network IP

**Symptoms:**
- Network card shows `100.70.145.121` instead of `192.168.0.63`
- Difficult to identify Pi on local network

**Root Cause:** systemStats.js prioritizes first non-internal interface (Tailscale before WiFi)

**Solution:**
```javascript
// File: server/services/systemStats.js
// Prioritize local network IPs over VPN

let ip = 'Unknown';
if (Array.isArray(network)) {
  // First try to find local network IP (192.168.x.x or 10.x.x.x)
  const localIface = network.find(iface => 
    !iface.internal && iface.ip4 && 
    (iface.ip4.startsWith('192.168.') || iface.ip4.startsWith('10.'))
  );
  
  if (localIface) {
    ip = localIface.ip4;
  } else {
    // Fall back to any non-internal interface
    ip = network.find(iface => !iface.internal && iface.ip4)?.ip4 || 'Unknown';
  }
}
```

**Verification:**
- Restart server: `pm2 restart pi-server`
- Dashboard should now show `192.168.0.63`

---

## MQTT Communication Problems

### Issue 3: Arduino MQTT Topic Mismatch
**Problem:** Arduino publishes to wrong MQTT topics, server doesn't receive messages

**Symptoms:**
```
Arduino Serial Monitor: Publishing to "hana/sensor/status"
Server Logs: Subscribed to "hana/arduino/status" ❌
Result: No communication
```

**Root Cause:** Inconsistent topic names between `config.h` and `mqtt_helper.h`

**Files Affected:**
- `Arduino/cat_detector/config.h` - Defines `MQTT_TOPIC_STATUS`, `MQTT_TOPIC_MOTION`
- `Arduino/cat_detector/mqtt_helper.h` - Used wrong variable `MQTT_TOPIC_SENSOR`

**Solution:**
```cpp
// File: Arduino/cat_detector/mqtt_helper.h
// Line 50-55: Fix topic variable names

// ❌ WRONG:
client.publish(MQTT_TOPIC_SENSOR, jsonBuffer);  // Variable doesn't exist

// ✅ CORRECT:
client.publish(MQTT_TOPIC_STATUS, jsonBuffer);  // Matches config.h
```

**Complete Fix:**
```cpp
void sendStatus() {
  StaticJsonDocument<200> doc;
  doc["type"] = "status";
  doc["message"] = "Heartbeat - System Active";
  doc["uptime"] = millis() / 1000;
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["ip"] = WiFi.localIP().toString();
  
  char jsonBuffer[256];
  serializeJson(doc, jsonBuffer);
  
  // Use MQTT_TOPIC_STATUS (not MQTT_TOPIC_SENSOR)
  client.publish(MQTT_TOPIC_STATUS, jsonBuffer);
}

void sendMotionAlert() {
  StaticJsonDocument<128> doc;
  doc["type"] = "motion";
  doc["active"] = true;
  doc["timestamp"] = millis();
  
  char jsonBuffer[128];
  serializeJson(doc, jsonBuffer);
  
  // Use MQTT_TOPIC_MOTION (not MQTT_TOPIC_SENSOR)
  client.publish(MQTT_TOPIC_MOTION, jsonBuffer);
}
```

**Verification:**
1. Upload fixed code to Arduino
2. Monitor server logs: `pm2 logs pi-server`
3. Should see: `🤖 Arduino: Heartbeat - System Active (uptime: 30s)`

**Key Learnings:**
- MQTT topics must match EXACTLY between publisher and subscriber
- Use consistent variable names across all files
- Always test MQTT communication with `pm2 logs` or MQTT client

---

### Issue 4: Server Not Receiving MQTT Messages
**Problem:** Arduino sends heartbeats, but server shows no MQTT activity

**Symptoms:**
- Arduino Serial: "Sent Status: Arduino started"
- Server logs: Silent, no MQTT messages
- Dashboard: Arduino shows "OFFLINE"

**Debugging Steps:**
```bash
# 1. Check server is subscribed to MQTT
pm2 logs pi-server | grep "Subscribed"
# Should see: ✅ Subscribed to: hana/motion/detected
#             ✅ Subscribed to: hana/arduino/status

# 2. Test MQTT broker connectivity
mosquitto_sub -h broker.hivemq.com -t "hana/#" -v
# Should see messages when Arduino sends them

# 3. Check Arduino is connected to MQTT
# Arduino Serial should show: "Connecting to MQTT...connected"
```

**Common Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Wrong broker address | Update `config.h`: `#define MQTT_BROKER "broker.hivemq.com"` |
| Port blocked | Use port 1883 (not 8883 unless using TLS) |
| Topic typo | Verify topics match: `hana/motion/detected`, `hana/arduino/status` |
| Arduino offline | Check WiFi connection, restart Arduino |
| Server not running | `pm2 restart pi-server` |

---

## Server Crashes & Missing Dependencies

### Issue 5: Server Crash - "Cannot find module 'mqtt'"
**Problem:** PM2 shows server restarting 379+ times

**Symptoms:**
```bash
pm2 list
# ┌─────┬───────────┬──────┬──────┐
# │ id  │ name      │ ↺    │ status│
# ├─────┼───────────┼──────┼───────┤
# │ 0   │ pi-server │ 379  │ online│  ⚠️ High restart count!
# └─────┴───────────┴──────┴───────┘

pm2 logs pi-server --lines 20
# Error: Cannot find module 'mqtt'
```

**Root Cause:** `package.json` missing MQTT and SQLite dependencies

**Solution:**
```bash
cd ~/H4.PI/server
npm install mqtt sqlite3 better-sqlite3
pm2 restart pi-server

# Verify installation:
ls node_modules/ | grep -E "mqtt|sqlite"
# Should show: mqtt, sqlite3, better-sqlite3
```

**Why it happened:**
- Dependencies added to code but not in `package.json`
- Running `npm install` on Pi doesn't install unlisted packages
- Need to manually install or update `package.json`

**Prevention:**
```json
// File: server/package.json
{
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^5.2.1",
    "mqtt": "^5.3.4",              // ✅ Add this
    "socket.io": "^4.8.3",
    "sqlite3": "^5.1.7",           // ✅ Add this
    "better-sqlite3": "^9.2.2",    // ✅ Add this
    "systeminformation": "^5.29.1"
  }
}
```

---

### Issue 6: Server Crash - "ReferenceError: path is not defined"
**Problem:** Motion detection workflow crashes when broadcasting photo URL

**Symptoms:**
```bash
pm2 logs pi-server
# ✅ Photo captured: /home/tian/cat_photos/cat_2026-01-09T14-30-56-264Z.jpg
# ✅ Detection saved with ID: 7
# ❌ ReferenceError: path is not defined
#    at handleMotionDetection (/home/tian/H4.PI/server/services/mqttService.js:89:32)
```

**Root Cause:** Used `path.basename()` without importing `path` module

**Solution:**
```javascript
// File: server/services/mqttService.js
// Add at top of file (line 1-2):

const mqtt = require('mqtt');
const path = require('path');  // ✅ Add this line
const { capturePhoto } = require('./cameraService');
```

**Full Context:**
```javascript
// Line 88-93: Where path is used
io.emit('cat-detection', {
  id: detectionId,
  timestamp: new Date().toISOString(),
  isHana: analysis.isHana,
  confidence: analysis.confidence,
  photoUrl: `/cat-photos/${path.basename(photoPath)}`  // Needs path module
});
```

**Fix Deployment:**
```bash
# On laptop:
git add server/services/mqttService.js
git commit -m "fix: add missing path import in mqttService.js"
git push origin main

# On Pi:
cd ~/H4.PI
git pull origin main
pm2 restart pi-server
```

---

### Issue 7: SQLite3 Installation Fails on Pi
**Problem:** `npm install sqlite3` shows 404 error

**Error Message:**
```
npm ERR! 404 Not Found - GET https://registry.npmjs.org/sqlite3 - Not found
npm ERR! 404 'sqlite3@*' is not in this registry.
```

**Cause:** SQLite3 requires native compilation, may fail on ARM architecture

**Solution 1 (Recommended): Use better-sqlite3**
```bash
npm install better-sqlite3 mqtt
# better-sqlite3 is faster, easier to install, and more reliable on Pi
```

**Solution 2: Build SQLite3 from source**
```bash
sudo apt install -y python3 make g++
npm install sqlite3 --build-from-source
```

**Code Update (if needed):**
```javascript
// Option 1: Keep using sqlite3 (if successfully installed)
const sqlite3 = require('sqlite3').verbose();

// Option 2: Switch to better-sqlite3 (recommended)
const Database = require('better-sqlite3');
const db = new Database('/path/to/database.db');
```

---

## Dashboard UI Issues

### Issue 8: Sidebar Covering Content
**Problem:** Fixed sidebar overlaps main dashboard content

**Symptoms:**
- Info box at bottom covered by sidebar
- Content not responsive to sidebar state
- Poor mobile/tablet experience

**Solution:**
```css
/* File: dashboard/src/App.css */

.main-content {
  flex: 1;
  padding: 0;
  display: flex;
  flex-direction: column;
  transition: margin-left 0.3s ease;
}

.main-content.sidebar-open {
  margin-left: 250px;  /* Sidebar width */
}

.main-content.sidebar-closed {
  margin-left: 0;
}

/* Remove fixed positioning from info-box */
.info-box {
  margin-top: 2rem;
  padding: 1.5rem;
  /* Remove: position: fixed; bottom: 2rem; */
}
```

**React State Management:**
```tsx
// File: dashboard/src/App.tsx
const [sidebarOpen, setSidebarOpen] = useState(true);

<div className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
  {/* Content */}
</div>
```

---

### Issue 9: Close Button Overlapping Sidebar Title
**Problem:** Close button (✕) covers "MONITORING" text

**Solution:**
```css
/* File: dashboard/src/Sidebar.css */

.sidebar-header {
  padding: 50px 20px 30px 20px;  /* Increased top padding */
  border-bottom: 2px solid #33ff00;
  position: relative;
}

.close-btn {
  position: absolute;
  top: 10px;      /* Moved higher */
  right: 10px;
  width: 30px;    /* Smaller button */
  height: 30px;
  font-size: 1.2em;
  /* ... */
}
```

---

### Issue 10: Cat Photos Not Displaying in Dashboard
**Problem:** Arduino sensor tab doesn't show captured photos

**Symptoms:**
- Motion detected, photos saved on Pi
- Dashboard shows "No motion detected yet"
- Network tab shows 404 errors for `/cat-photos/...`

**Root Causes:**
1. Static file serving not configured
2. WebSocket event listener missing
3. No UI component to display photos

**Solution - Part 1: Server Configuration**
```javascript
// File: server/server.js
// Add static file serving:

app.use('/cat-photos', express.static('/home/tian/cat_photos'));
```

**Solution - Part 2: Frontend State Management**
```tsx
// File: dashboard/src/App.tsx

interface CatDetection {
  id: number;
  timestamp: string;
  isHana: boolean;
  confidence: number;
  photoUrl: string;
}

const [catDetections, setCatDetections] = useState<CatDetection[]>([]);

// Add WebSocket listener:
socket.on('cat-detection', (detection: CatDetection) => {
  console.log('Cat detection:', detection);
  setCatDetections(prev => [detection, ...prev].slice(0, 10)); // Keep last 10
});
```

**Solution - Part 3: UI Component**
```tsx
// File: dashboard/src/ArduinoView.tsx

<div className="detection-gallery">
  <h3>Recent Detections</h3>
  {detections.length === 0 ? (
    <p>No motion detected yet. Wave at the sensor!</p>
  ) : (
    <div className="photo-grid">
      {detections.map((detection) => (
        <div key={detection.id} className="photo-card">
          <img 
            src={`${SOCKET_URL}${detection.photoUrl}`} 
            alt={`Detection ${detection.id}`}
          />
          <div className="photo-info">
            <span className={detection.isHana ? 'is-hana' : 'not-hana'}>
              {detection.isHana ? '🐱 Hana!' : '❓ Unknown'}
            </span>
            <span>{(detection.confidence * 100).toFixed(1)}%</span>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
```

---

## Camera & Detection Workflow

### Issue 11: Camera Detection Working but Dashboard Not Updated
**Problem:** Camera captures photos, AI analyzes, but dashboard shows nothing

**Server Logs:**
```
✅ Photo captured: /home/tian/cat_photos/cat_2026-01-09.jpg
✅ Detection saved with ID: 7
❌ ReferenceError: path is not defined  // Prevents WebSocket broadcast
```

**Flow Analysis:**
```
Arduino PIR Sensor
  ↓ (MQTT)
Pi Server receives motion event
  ↓
capturePhoto() ✅ SUCCESS
  ↓
analyzeCat() ✅ SUCCESS
  ↓
saveDetection() ✅ SUCCESS
  ↓
io.emit('cat-detection') ❌ CRASHES (path not defined)
  ↓
Dashboard never receives event ❌
```

**Solution:** Fix path import (see Issue #6)

---

## Arduino Connection & Reliability Issues

### Issue 12: Arduino Loses WiFi Connection and Doesn't Reconnect
**Problem:** Arduino shows "OFFLINE" after WiFi interruption, requires manual restart

**Symptoms:**
- Dashboard shows "OFFLINE" + "Waiting for heartbeat"
- Arduino was online but stopped sending MQTT messages
- Ping to Arduino IP fails
- Weak WiFi signal (-70 to -80 dBm range)

**Root Cause:** Original Arduino code doesn't have WiFi/MQTT auto-reconnect logic

**Solution:**
```cpp
// File: Arduino/cat_detector/cat_detector.ino
// Update loop() function:

void loop() {
  unsigned long currentMillis = millis();
  
  // Check WiFi connection first (most critical)
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi lost! Reconnecting...");
    digitalWrite(LED_PIN, HIGH); // LED on during reconnect
    connectToWiFi(WIFI_HOME_SSID, WIFI_HOME_PASS);
    digitalWrite(LED_PIN, LOW);
    
    // After WiFi reconnects, reconnect MQTT
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("✅ WiFi reconnected! Reconnecting MQTT...");
      connectToMQTT("HanaCatDetector");
    }
  }
  
  // Maintain MQTT connection
  if (!mqttClient.connected()) {
    Serial.println("⚠️ MQTT lost! Reconnecting...");
    reconnectMQTT(nullptr);
  }
  mqttClient.loop();
  
  // ... rest of motion detection code
}
```

**WiFi Signal Strength Guide:**
```
-30 to -50 dBm: Excellent ✅
-50 to -60 dBm: Good ✅
-60 to -70 dBm: Fair ⚠️
-70 to -80 dBm: Weak ❌ Connection drops likely
-80 to -90 dBm: Very Weak ❌ Unusable
```

**Improvements for Weak WiFi:**
1. Move Arduino closer to router
2. Use WiFi repeater/extender
3. Change router channel to less congested one
4. Set static IP to prevent DHCP issues
5. Adjust antenna orientation

---

### Issue 13: Dashboard Shows "NaNm" for Arduino Uptime
**Problem:** Uptime card displays "NaNm" instead of actual time

**Symptoms:**
```
UPTIME
NaNm
s total
```

**Root Cause:** Arduino sends uptime as number, but React component doesn't validate it before calculation

**Solution:**
```tsx
// File: dashboard/src/ArduinoView.tsx
// Add validation before using uptime value:

const isOnline = lastUpdate && (Date.now() - lastUpdate.getTime() < 60000);

// Fix NaN issue - ensure uptime is a valid number
const uptimeSeconds = typeof data.uptime === 'number' && !isNaN(data.uptime) ? data.uptime : 0;
const uptimeMinutes = Math.floor(uptimeSeconds / 60);
const uptimeHours = Math.floor(uptimeMinutes / 60);
const remainingMinutes = uptimeMinutes % 60;
```

**Verification:**
After fix, should display: `0h 5m` or `1h 23m` instead of `NaNm`

---

### Issue 14: Recent Detections Section Shows "No motion detected"
**Problem:** Motion is detected, photos captured, but dashboard doesn't show them

**Symptoms:**
- Arduino sensor triggers (see in logs)
- Photos saved to `/home/tian/cat_photos/`
- Dashboard shows: "No motion detected yet. Wave at the sensor!"
- PM2 logs show: `ReferenceError: path is not defined`

**Root Cause Chain:**
1. Motion detected → Pi captures photo ✅
2. Detection saved to database ✅
3. Server tries to broadcast to dashboard via WebSocket
4. **CRASH**: `path is not defined` error in mqttService.js ❌
5. WebSocket message never sent → Dashboard never updates ❌

**Solution:** Already fixed in local code, needs deployment to Pi
```bash
# On laptop - commit fix:
git add server/services/mqttService.js
git commit -m "fix: add missing path import in mqttService.js"
git push origin main

# On Pi - pull and restart:
cd ~/H4.PI
git pull origin main
pm2 restart pi-server
pm2 logs pi-server --lines 30  # Verify error is gone
```

**After fix, you should see:**
```bash
pm2 logs pi-server
# ✅ Photo captured: /home/tian/cat_photos/cat_*.jpg
# ✅ Detection saved with ID: X
# ✅ Broadcasted to dashboard  ← This line should appear now
```

---

### Issue 15: Diagnosing Arduino Connection States

**Dashboard Offline + Ping Fails = Critical Hardware Issue ❌**

| Symptom | Ping Result | Cause | Solution |
|---------|-------------|-------|----------|
| OFFLINE | ✅ Success | MQTT disconnected, will auto-recover | Wait 30-60s or restart Arduino |
| OFFLINE | ❌ Fails, no LED | No power | Check USB/power cable |
| OFFLINE | ❌ Fails, LED on | WiFi lost | Check router, restart Arduino |
| OFFLINE | ❌ Different IP responds | DHCP changed IP | Update IP or set static IP |
| ONLINE | ✅ Success | Normal operation | No action needed ✅ |

**Quick Diagnosis Commands:**
```bash
# 1. Check if Arduino responds to ping
ping 192.168.0.66

# 2. If ping fails, scan network for Arduino
arp -a | grep -i "arduino"
nmap -sn 192.168.0.0/24  # Find all devices

# 3. Check router DHCP table
# Login to router admin → DHCP clients → Look for Arduino MAC address

# 4. Test MQTT manually
mosquitto_sub -h broker.hivemq.com -t "hana/#" -v
# Walk past sensor, should see messages

# 5. Check PM2 server logs
pm2 logs pi-server --lines 50
# Should see Arduino heartbeats every 30 seconds
```

**Prevention: Set Static IP for Arduino**
```cpp
// File: Arduino/cat_detector/config.h
// Add before WiFi.begin():

IPAddress local_IP(192, 168, 0, 66);
IPAddress gateway(192, 168, 0, 1);
IPAddress subnet(255, 255, 255, 0);

if (!WiFi.config(local_IP, gateway, subnet)) {
  Serial.println("Static IP configuration failed");
}
WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
```

---

## Deployment Checklist

### Before Deploying to Pi:
```bash
# 1. Commit all changes
git add .
git commit -m "describe changes"
git push origin main

# 2. SSH into Pi
ssh tian@100.82.69.79

# 3. Pull latest code
cd ~/H4.PI
git pull origin main

# 4. Install dependencies
cd server
npm install

cd ../dashboard
npm install
npm run build

# 5. Restart services
pm2 restart pi-server
pm2 logs pi-server --lines 50  # Check for errors

# 6. Test dashboard
# Visit: http://100.82.69.79:5173 or http://192.168.0.63:5173
```

---

## Common PM2 Commands

```bash
# View running processes
pm2 list

# View logs (real-time)
pm2 logs pi-server

# View last 50 lines
pm2 logs pi-server --lines 50

# Restart server
pm2 restart pi-server

# Stop server
pm2 stop pi-server

# Start server
pm2 start server.js --name pi-server

# Save PM2 configuration
pm2 save

# Setup auto-start on boot
pm2 startup
```

---

## Debug Log Analysis Guide

### Understanding Log Symbols:
- 🟢 **Green "INFO"** = Normal operation (camera configuring, MQTT connected)
- 🔵 **Blue icons** (📨,🤖,📸) = Events (MQTT message, Arduino status, photo capture)
- ✅ **Green checkmark** = Success (connection established, photo saved)
- ❌ **Red X** = Error (module not found, workflow failed)
- ⚠️ **Yellow "WARN"** = Warning (deprecated package, slow operation)

### Critical Error Patterns:
```bash
# Pattern 1: High restart count
pm2 list
# ↺ = 300+  ⚠️ Server is crash-looping, check logs for error

# Pattern 2: Module not found
Error: Cannot find module 'mqtt'
# → Run: npm install mqtt

# Pattern 3: Reference error
ReferenceError: path is not defined
# → Missing import: const path = require('path');

# Pattern 4: MQTT silence
# No messages for 60+ seconds after motion
# → Check Arduino Serial Monitor, verify MQTT topics
```

---

## Auto-Deployment Issues

### Issue: TypeScript Compilation Fails During GitHub Webhook Deployment
**Problem:** Automatic deployment fails with TypeScript errors after pushing code changes

**Symptoms:**
```
❌ Background deployment failed: Error: Command failed: cd /home/tian/H4.PI/dashboard && npm run build
error TS2719: Type 'ArduinoData | null' is not assignable to type 'ArduinoData | null'
Property 'msg' is missing in type 'ArduinoData' but required in type 'ArduinoData'
```

- PM2 server keeps running with OLD code
- Dashboard works but doesn't update after git push
- Webhook triggers but build step fails
- Console shows "Frontend files changed, rebuilding..." but ends in error

**Root Cause:** TypeScript sees duplicate interface definitions across multiple files

**Problem Pattern:**
```typescript
// ❌ BAD: Duplicate definitions
// App.tsx
interface ArduinoData {
  message: string;
  uptime: number;
}

// ArduinoStatus.tsx
interface ArduinoData {
  message: string;
  uptime: number;
}

// ArduinoView.tsx
interface ArduinoData {
  msg: string;  // ← Field name mismatch!
  uptime: number;
}
```

TypeScript with `verbatimModuleSyntax` enabled treats each definition as a separate type, causing conflicts.

**Solution:**
1. **Create shared types file:**
```typescript
// dashboard/src/types.ts
export interface SystemData {
  load: string;
  temperature: string;
  memoryUsage: string;
  totalMemory: string;
  ipAddress: string;
  uptime: string;
}

export interface ArduinoData {
  message: string;  // Match what Arduino sends via MQTT
  uptime: number;
  wifi_rssi?: number;
  ip?: string;
}

export interface CatDetection {
  id: number;
  timestamp: string;
  isHana: boolean;
  confidence: number;
  photoUrl: string;
}
```

2. **Import types using `import type` syntax:**
```typescript
// ✅ GOOD: Use shared types
// App.tsx
import type { SystemData, ArduinoData, CatDetection } from './types';

// ArduinoStatus.tsx
import type { ArduinoData } from './types';

// ArduinoView.tsx
import type { ArduinoData, CatDetection } from './types';
```

3. **Update all field references:**
```typescript
// Update all instances of data.msg to data.message
<p className="status-info">{data.message}</p>
```

**Verification:**
```bash
# Check for remaining duplicate definitions
cd dashboard/src
grep -r "interface ArduinoData" --include="*.tsx" --include="*.ts"
# Should only appear in types.ts

# Verify field usage
grep -r "data\.msg\b" --include="*.tsx"
# Should return no results

# Test build locally
cd dashboard
npm run build
# Should succeed without errors
```

**After fixing:**
- Commit and push changes
- Webhook triggers automatically
- Build succeeds: `✅ Frontend rebuilt successfully`
- Dashboard updates with new code
- PM2 restarts server automatically

**Key Learnings:**
- Use a single source of truth for TypeScript types
- Use `import type` for type-only imports when `verbatimModuleSyntax` is enabled
- Match interface field names to actual data received from backend/MQTT
- Test `npm run build` locally before pushing to catch TypeScript errors early

---

## Contact & Resources

**Project Structure:**
```
4. PI/
├── server/           # Node.js backend
├── dashboard/        # React frontend
├── Arduino/          # Arduino sketch
└── data/            # SQLite database
```

**Key Files:**
- Server: `server/server.js`, `server/services/mqttService.js`
- Dashboard: `dashboard/src/App.tsx`, `dashboard/src/ArduinoView.tsx`
- Arduino: `Arduino/cat_detector/cat_detector.ino`, `Arduino/cat_detector/mqtt_helper.h`

**Documentation:**
- [ARCHITECTURE.md](ARCHITECTURE.md) - System design overview
- [CAT_DETECTION_SETUP.md](CAT_DETECTION_SETUP.md) - AI detection setup
- [server/README.md](server/README.md) - Backend documentation
- [dashboard/README.md](dashboard/README.md) - Frontend documentation

**External Resources:**
- MQTT Broker: [broker.hivemq.com](https://www.hivemq.com/public-mqtt-broker/)
- Pi Camera: [Raspberry Pi Documentation](https://www.raspberrypi.com/documentation/computers/camera_software.html)
- PM2: [PM2 Documentation](https://pm2.keymetrics.io/docs/usage/quick-start/)

---

*For additional support, check commit history for specific bug fixes:*
```bash
git log --oneline --grep="fix:"
```
