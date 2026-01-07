# IoT Edge Computing Architecture - Arduino + Pi + Database
# 物联网边缘计算架构 - Arduino + 树莓派 + 数据库

---

## Your Current vs Future Architecture
## 你的当前架构 vs 未来架构

### Current Setup (What You Have Now) / 当前设置（你现在拥有的）

```
┌──────────────────────────────────┐
│  Raspberry Pi                    │
│  树莓派                            │
│                                  │
│  ┌────────────────────┐          │
│  │  Node.js Server    │          │
│  │  Reads Pi's own    │          │
│  │  CPU, temp, memory │          │
│  └──────────┬─────────┘          │
│             │                    │
│             ↓                    │
│  ┌────────────────────┐          │
│  │  Dashboard         │          │
│  │  Shows Pi stats    │          │
│  └────────────────────┘          │
│                                  │
└──────────────────────────────────┘

Data stored: NOWHERE (only real-time)
数据存储：无处（仅实时）
```

### Future Setup (Edge Computing with Arduino) / 未来设置（使用Arduino的边缘计算）

```
┌─────────────────────────┐
│  Arduino + Sensors      │         ← NEW!
│  Arduino + 传感器        │         ← 新增！
│                         │
│  📊 DHT22: Humidity     │
│  📊 DHT22: Temperature  │
│  💨 Fan control         │
│  🌱 Soil moisture       │
│  💡 Light sensor        │
└────────────┬────────────┘
             │
             │ MQTT Protocol
             │ MQTT协议
             ↓
┌──────────────────────────────────────────────┐
│  Raspberry Pi (Edge Gateway)                 │
│  树莓派（边缘网关）                             │
│                                              │
│  ┌────────────────────────────────────┐     │
│  │  MQTT Broker (Mosquitto)           │     │
│  │  Receives data from Arduino        │     │
│  │  从Arduino接收数据                    │     │
│  └──────────────┬─────────────────────┘     │
│                 │                            │
│                 ↓                            │
│  ┌────────────────────────────────────┐     │
│  │  Node.js Server                    │     │
│  │  - Subscribes to MQTT              │     │
│  │  - Processes data                  │     │
│  │  - Saves to database               │     │
│  │  - Broadcasts to dashboard         │     │
│  │  - 订阅MQTT                         │     │
│  │  - 处理数据                          │     │
│  │  - 保存到数据库                       │     │
│  │  - 广播到仪表板                       │     │
│  └──────────────┬─────────────────────┘     │
│                 │                            │
│        ┌────────┴────────┐                  │
│        ↓                 ↓                   │
│  ┌──────────┐    ┌──────────────┐          │
│  │ Database │    │ Dashboard    │          │
│  │ 数据库    │    │ 仪表板        │          │
│  │          │    │              │          │
│  │ Stores   │    │ Shows:       │          │
│  │ history  │    │ - Live data  │          │
│  │ 存储历史  │    │ - Graphs     │          │
│  │          │    │ - History    │          │
│  └──────────┘    └──────────────┘          │
│                                              │
└──────────────────────────────────────────────┘
```

---

## Where Should the Database Be? / 数据库应该放在哪里？

### Option 1: Database on Raspberry Pi (Recommended for Edge Computing)
### 选项1：数据库在树莓派上（边缘计算推荐）

**✅ BEST for Edge Computing / 边缘计算的最佳选择**

```
┌──────────────────────────────┐
│  Raspberry Pi                │
│                              │
│  Arduino data → Node.js →    │
│  [DATABASE HERE] → Dashboard │
│                              │
└──────────────────────────────┘
```

**Advantages / 优点:**
- ✅ Fast (no internet needed)
- ✅ Works offline (internet down? Still works!)
- ✅ Low latency (instant data storage)
- ✅ No cloud costs
- ✅ Privacy (data stays at home)
- ✅ True edge computing architecture

**快速（不需要互联网）**
**离线工作（互联网断了？仍然工作！）**
**低延迟（即时数据存储）**
**无云成本**
**隐私（数据留在家里）**
**真正的边缘计算架构**

**Disadvantages / 缺点:**
- ⚠️ Limited storage (Pi's SD card)
- ⚠️ No access to historical data when away from home (unless using ngrok)
- ⚠️ If Pi fails, data is lost

### Option 2: Database in Cloud (AWS, Google Cloud, Azure)
### 选项2：数据库在云端（AWS、Google Cloud、Azure）

```
┌──────────────────────────────┐
│  Raspberry Pi                │
│  Arduino data → Node.js      │
└──────────────┬───────────────┘
               │
               │ Internet
               ↓
┌──────────────────────────────┐
│  Cloud                       │
│  [DATABASE HERE]             │
│  AWS RDS / Google Cloud SQL  │
└──────────────────────────────┘
```

**Advantages / 优点:**
- ✅ Access data from anywhere (no ngrok needed)
- ✅ Unlimited storage
- ✅ Automatic backups
- ✅ Scalable

**Disadvantages / 缺点:**
- ❌ Costs money (monthly fees)
- ❌ Needs internet to work
- ❌ Slower (data travels to cloud and back)
- ❌ Privacy concerns (data in third-party servers)
- ❌ NOT edge computing (defeats the purpose)

### Option 3: Hybrid (Pi Database + Cloud Sync)
### 选项3：混合（树莓派数据库 + 云同步）

**✅ Best of Both Worlds / 两全其美**

```
┌──────────────────────────────┐
│  Raspberry Pi                │
│  Arduino → Node.js           │
│  ↓                           │
│  [Local Database]            │
│  ↓                           │
│  Dashboard (fast access)     │
│  ↓                           │
│  Sync to cloud (every hour)  │
└──────────────┬───────────────┘
               │
               ↓
┌──────────────────────────────┐
│  Cloud Database (Backup)     │
│  Access from anywhere        │
└──────────────────────────────┘
```

**Advantages / 优点:**
- ✅ Fast local access
- ✅ Works offline
- ✅ Cloud backup
- ✅ Remote access to history

---

## Recommended Database Choice / 推荐的数据库选择

### For Beginners: SQLite / 适合初学者：SQLite

**What is it? / 这是什么？**
- Simple file-based database (just 1 file!)
- No separate server needed
- Perfect for small IoT projects
- 简单的基于文件的数据库（只有1个文件！）
- 不需要单独的服务器
- 非常适合小型物联网项目

**Pros / 优点:**
- ✅ Easy to setup (1 command: `npm install sqlite3`)
- ✅ No configuration needed
- ✅ Lightweight (uses little memory)
- ✅ Perfect for beginners

**Cons / 缺点:**
- ⚠️ Single user (only one connection at a time)
- ⚠️ Not ideal for millions of records
- ⚠️ No built-in time-series features

**When to use / 何时使用:**
- Learning/prototyping
- Small home projects
- <10,000 sensor readings per day

### For Time-Series Data: InfluxDB / 适合时间序列数据：InfluxDB

**What is it? / 这是什么？**
- Database specifically designed for sensor data over time
- Optimized for IoT and metrics
- 专门为随时间变化的传感器数据设计的数据库
- 为物联网和指标优化

**Pros / 优点:**
- ✅ Built for time-series data (temp over time, humidity over time)
- ✅ Fast queries for charts/graphs
- ✅ Automatic data retention (delete old data automatically)
- ✅ Perfect for dashboards

**Cons / 缺点:**
- ⚠️ More complex setup
- ⚠️ Uses more memory
- ⚠️ Learning curve

**When to use / 何时使用:**
- Production IoT projects
- Need historical graphs
- >10,000 readings per day

### For Advanced: PostgreSQL + TimescaleDB / 适合高级：PostgreSQL + TimescaleDB

**What is it? / 这是什么？**
- Full-featured SQL database
- TimescaleDB extension adds time-series features
- 全功能SQL数据库
- TimescaleDB扩展添加时间序列功能

**Pros / 优点:**
- ✅ Most powerful
- ✅ Complex queries
- ✅ Relational data + time-series
- ✅ Industry standard

**Cons / 缺点:**
- ⚠️ Heaviest (uses most memory on Pi)
- ⚠️ Most complex setup
- ⚠️ Overkill for simple projects

---

## Recommended Architecture for Your Project
## 你的项目推荐架构

### Start Simple: SQLite on Pi / 从简单开始：树莓派上的SQLite

```
┌─────────────────────────────────────────────────┐
│  Arduino                                        │
│  - DHT22 sensor (humidity, temperature)        │
│  - Fan control                                  │
└──────────────────┬──────────────────────────────┘
                   │
                   │ MQTT (wifi/ethernet)
                   │
┌──────────────────▼──────────────────────────────┐
│  Raspberry Pi (Edge Gateway)                    │
│                                                 │
│  ┌────────────────────────────────────────┐    │
│  │  Mosquitto MQTT Broker                 │    │
│  │  Port 1883                             │    │
│  └──────────────┬─────────────────────────┘    │
│                 │                               │
│                 ↓                               │
│  ┌────────────────────────────────────────┐    │
│  │  Node.js Server (server.js)            │    │
│  │                                         │    │
│  │  Subscribes to:                         │    │
│  │  - sensor/temperature                   │    │
│  │  - sensor/humidity                      │    │
│  │                                         │    │
│  │  For each message:                      │    │
│  │  1. Save to SQLite                      │    │
│  │  2. Broadcast via WebSocket             │    │
│  │  3. Calculate averages                  │    │
│  │  4. Trigger fan if temp > 30°C          │    │
│  └──────────────┬─────────────────────────┘    │
│                 │                               │
│        ┌────────┴────────┐                     │
│        ↓                 ↓                      │
│  ┌──────────┐    ┌──────────────────┐         │
│  │ SQLite   │    │ Dashboard        │         │
│  │ Database │    │ (React App)      │         │
│  │          │    │                  │         │
│  │ sensors  │    │ Shows:           │         │
│  │ .db      │    │ - Live temp      │         │
│  │          │    │ - Live humidity  │         │
│  │ 100MB    │    │ - 24hr graph     │         │
│  │          │    │ - 7-day graph    │         │
│  └──────────┘    │ - Fan status     │         │
│                  └──────────────────┘         │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## Database Schema / 数据库架构

### SQLite Tables / SQLite表

```sql
-- Sensor readings table
-- 传感器读数表
CREATE TABLE sensor_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    sensor_type TEXT NOT NULL,          -- 'temperature', 'humidity'
    value REAL NOT NULL,                 -- 25.5, 60.3
    location TEXT DEFAULT 'living_room', -- optional
    arduino_id TEXT DEFAULT 'arduino_01' -- if multiple Arduinos
);

-- Device status table
-- 设备状态表
CREATE TABLE device_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    device_name TEXT NOT NULL,           -- 'fan', 'heater'
    status TEXT NOT NULL,                -- 'on', 'off'
    triggered_by TEXT                    -- 'auto', 'manual'
);

-- System logs table (optional)
-- 系统日志表（可选）
CREATE TABLE system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    level TEXT,                          -- 'info', 'warning', 'error'
    message TEXT
);
```

### Example Data / 示例数据

```
sensor_data:
┌────┬─────────────────────┬─────────────┬───────┬─────────────┐
│ id │ timestamp           │ sensor_type │ value │ location    │
├────┼─────────────────────┼─────────────┼───────┼─────────────┤
│ 1  │ 2026-01-06 10:00:00 │ temperature │ 25.5  │ living_room │
│ 2  │ 2026-01-06 10:00:00 │ humidity    │ 60.3  │ living_room │
│ 3  │ 2026-01-06 10:00:30 │ temperature │ 25.6  │ living_room │
│ 4  │ 2026-01-06 10:00:30 │ humidity    │ 60.2  │ living_room │
└────┴─────────────────────┴─────────────┴───────┴─────────────┘

device_status:
┌────┬─────────────────────┬─────────────┬────────┬──────────────┐
│ id │ timestamp           │ device_name │ status │ triggered_by │
├────┼─────────────────────┼─────────────┼────────┼──────────────┤
│ 1  │ 2026-01-06 10:05:00 │ fan         │ on     │ auto         │
│ 2  │ 2026-01-06 10:15:00 │ fan         │ off    │ auto         │
│ 3  │ 2026-01-06 11:00:00 │ fan         │ on     │ manual       │
└────┴─────────────────────┴─────────────┴────────┴──────────────┘
```

---

## Updated Node.js Server (server.js)
## 更新的Node.js服务器（server.js）

```javascript
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mqtt = require('mqtt');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

// Connect to MQTT broker
const mqttClient = mqtt.connect('mqtt://localhost:1883');

// Connect to SQLite database
const db = new sqlite3.Database('./sensors.db');

// Create tables if they don't exist
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS sensor_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            sensor_type TEXT NOT NULL,
            value REAL NOT NULL,
            location TEXT DEFAULT 'living_room'
        )
    `);
    
    db.run(`
        CREATE TABLE IF NOT EXISTS device_status (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            device_name TEXT NOT NULL,
            status TEXT NOT NULL,
            triggered_by TEXT
        )
    `);
});

// Subscribe to MQTT topics when connected
mqttClient.on('connect', () => {
    console.log('Connected to MQTT broker');
    mqttClient.subscribe('sensor/temperature');
    mqttClient.subscribe('sensor/humidity');
    mqttClient.subscribe('device/fan/status');
});

// Handle incoming MQTT messages
mqttClient.on('message', (topic, message) => {
    const value = parseFloat(message.toString());
    console.log(`${topic}: ${value}`);
    
    // Save to database
    if (topic === 'sensor/temperature') {
        db.run(
            'INSERT INTO sensor_data (sensor_type, value) VALUES (?, ?)',
            ['temperature', value]
        );
        
        // Auto-control fan (edge computing logic!)
        if (value > 30) {
            mqttClient.publish('device/fan/command', 'on');
            db.run(
                'INSERT INTO device_status (device_name, status, triggered_by) VALUES (?, ?, ?)',
                ['fan', 'on', 'auto']
            );
        }
    } else if (topic === 'sensor/humidity') {
        db.run(
            'INSERT INTO sensor_data (sensor_type, value) VALUES (?, ?)',
            ['humidity', value]
        );
    }
    
    // Broadcast to dashboard via WebSocket
    io.emit('sensor-update', {
        type: topic.split('/')[1],
        value: value,
        timestamp: new Date().toISOString()
    });
});

// API endpoint: Get recent data
app.get('/api/recent', (req, res) => {
    db.all(`
        SELECT * FROM sensor_data 
        ORDER BY timestamp DESC 
        LIMIT 100
    `, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// API endpoint: Get 24-hour average
app.get('/api/average/24h', (req, res) => {
    db.all(`
        SELECT 
            sensor_type,
            AVG(value) as avg_value,
            MIN(value) as min_value,
            MAX(value) as max_value
        FROM sensor_data
        WHERE timestamp > datetime('now', '-24 hours')
        GROUP BY sensor_type
    `, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// API endpoint: Get historical data for graphs
app.get('/api/history/:hours', (req, res) => {
    const hours = parseInt(req.params.hours) || 24;
    db.all(`
        SELECT * FROM sensor_data
        WHERE timestamp > datetime('now', '-${hours} hours')
        ORDER BY timestamp ASC
    `, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

server.listen(5000, () => {
    console.log('Server running on port 5000');
});
```

---

## Data Flow / 数据流

```
Arduino senses temperature: 28.5°C
Arduino感应温度：28.5°C
        ↓
Publishes to MQTT: "sensor/temperature" = 28.5
发布到MQTT："sensor/temperature" = 28.5
        ↓
Pi MQTT Broker receives message
树莓派MQTT代理接收消息
        ↓
Node.js server subscribed to topic
Node.js服务器订阅主题
        ↓
┌───────────────────────────────┐
│ Node.js does 3 things:        │
│ Node.js做3件事：               │
│                               │
│ 1. Save to SQLite:            │
│    INSERT INTO sensor_data... │
│    保存到SQLite                │
│                               │
│ 2. Broadcast via WebSocket:   │
│    io.emit('sensor-update')   │
│    通过WebSocket广播           │
│                               │
│ 3. Check logic:               │
│    If temp > 30°C → turn fan  │
│    检查逻辑：如果温度>30°C→开风扇│
└───────────────────────────────┘
        ↓
Dashboard updates in real-time
仪表板实时更新
        ↓
User clicks "View History"
用户点击"查看历史"
        ↓
Fetch from database:
从数据库获取：
SELECT * FROM sensor_data
WHERE timestamp > datetime('now', '-24 hours')
```

---

## Storage Estimation / 存储估算

### How much space do you need? / 你需要多少空间？

```
Assumptions / 假设:
- 2 sensors (temperature + humidity)
- Reading every 30 seconds
- Each record = ~100 bytes

Per day / 每天:
2 sensors × 2 readings/min × 60 min × 24 hours = 5,760 readings
5,760 × 100 bytes = 576 KB per day

Per month / 每月:
576 KB × 30 = ~17 MB

Per year / 每年:
17 MB × 12 = ~200 MB

With 32GB SD card: Can store ~160 years of data!
使用32GB SD卡：可以存储约160年的数据！
```

**Recommendation / 建议:**
- Keep last 30 days of raw data
- Keep monthly averages forever
- 保留最近30天的原始数据
- 永久保留月平均值

```sql
-- Auto-delete old data (run daily)
-- 自动删除旧数据（每天运行）
DELETE FROM sensor_data 
WHERE timestamp < datetime('now', '-30 days');
```

---

## Installation Commands / 安装命令

### On Raspberry Pi / 在树莓派上

```bash
# 1. Install MQTT broker
sudo apt update
sudo apt install mosquitto mosquitto-clients -y
sudo systemctl enable mosquitto
sudo systemctl start mosquitto

# 2. Install SQLite (usually pre-installed)
sudo apt install sqlite3 -y

# 3. Install Node.js packages
cd ~/pi-dashboard-server
npm install mqtt sqlite3

# 4. Test MQTT
mosquitto_sub -h localhost -t 'sensor/#' -v
# In another terminal:
mosquitto_pub -h localhost -t 'sensor/temperature' -m '25.5'
```

---

## Summary / 总结

### Where Database Should Be / 数据库应该在哪里

**✅ RECOMMENDED: On Raspberry Pi (SQLite)**
**✅ 推荐：在树莓派上（SQLite）**

**Reasons / 原因:**
1. True edge computing (data processed locally)
2. Works offline
3. Fast (no internet latency)
4. Free (no cloud costs)
5. Easy to setup for beginners

**真正的边缘计算（数据在本地处理）**
**离线工作**
**快速（无互联网延迟）**
**免费（无云成本）**
**初学者容易设置**

### Full Stack / 完整技术栈

```
Hardware / 硬件:
- Arduino (sensors + actuators)
- Raspberry Pi (edge gateway + database + web server)

Protocols / 协议:
- MQTT (Arduino ↔ Pi communication)
- WebSocket (Pi ↔ Dashboard real-time updates)
- HTTP REST (Dashboard ↔ Pi historical data)

Software / 软件:
- Mosquitto (MQTT broker)
- SQLite (database)
- Node.js (backend logic)
- React (dashboard frontend)
- PM2 (process manager)
- Nginx (web server + reverse proxy)
```

### Data Journey / 数据旅程

```
1. Arduino reads sensor → MQTT publish
2. Pi MQTT broker receives → forwards to Node.js
3. Node.js saves to SQLite → broadcasts via WebSocket
4. Dashboard receives live data → shows on screen
5. User requests history → Query SQLite → Show graph

1. Arduino读取传感器 → MQTT发布
2. 树莓派MQTT代理接收 → 转发到Node.js
3. Node.js保存到SQLite → 通过WebSocket广播
4. 仪表板接收实时数据 → 在屏幕上显示
5. 用户请求历史 → 查询SQLite → 显示图表
```

---

**Ready to build this? / 准备好构建这个了吗？** 🚀

Next steps:
1. Install Mosquitto on Pi
2. Update server.js with database code
3. Connect Arduino with DHT22 sensor
4. Publish MQTT messages from Arduino
5. Watch data flow through the system!

---

**Last Updated**: January 6, 2026
