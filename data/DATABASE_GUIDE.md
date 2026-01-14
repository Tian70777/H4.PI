# Database Saving Workflow / 数据库保存流程
*Complete walkthrough of what gets saved when motion is detected*  
*运动检测时的完整数据保存流程*

---

## 📊 Complete Data Flow / 完整数据流

### English Flow:

```
1. Arduino PIR Sensor detects motion
   → Sends MQTT message to topic: hana/motion/detected
   
2. Pi Server receives MQTT message (mqttService.js)
   → Parses sensor data (which sensor triggered)
   
3. Camera captures 5-second video
   → Saves to: /home/tian/cat_videos/cat_2026-01-14T10-30-45-123Z.h264
   
4. Python analyzes video with TFLite model
   → Returns: { isHana: true, confidence: 0.87, ... }
   
5. ✅ saveDetection() saves ALL data to SQLite database
   
6. Dashboard receives WebSocket notification
   → Shows: "🐱 Hana detected! (87.3%)"
```

### 中文流程：

```
1. Arduino PIR 传感器检测到运动
   → 发送 MQTT 消息到主题：hana/motion/detected
   
2. 树莓派服务器接收 MQTT 消息 (mqttService.js)
   → 解析传感器数据（哪个传感器触发）
   
3. 摄像头录制 5 秒视频
   → 保存至：/home/tian/cat_videos/cat_2026-01-14T10-30-45-123Z.h264
   
4. Python 使用 TFLite 模型分析视频
   → 返回：{ isHana: true, confidence: 0.87, ... }
   
5. ✅ saveDetection() 将所有数据保存到 SQLite 数据库
   
6. 仪表板收到 WebSocket 通知
   → 显示："🐱 检测到 Hana！(87.3%)"
```

---

## 💾 What Gets Saved to Database / 数据库保存内容

### Database Record Example / 数据库记录示例

```sql
-- Table: detections
INSERT INTO detections (
  id,
  timestamp,
  is_hana,
  confidence,
  photo_path,
  color_features,
  sensor1,
  sensor2,
  location
) VALUES (
  23,                                           -- id: Auto-increment / 自动递增
  '2026-01-14 10:30:45',                       -- timestamp: When detected / 检测时间
  1,                                            -- is_hana: 1=yes, 0=no / 1=是Hana, 0=不是
  0.873,                                        -- confidence: 87.3% / 置信度：87.3%
  '/home/tian/cat_videos/cat_2026-01-14...h264', -- photo_path: Video file / 视频文件路径
  NULL,                                         -- color_features: Not used / 不使用
  1,                                            -- sensor1: Door sensor / 门传感器（针脚2）
  0,                                            -- sensor2: Window sensor / 窗传感器（针脚4）
  'sensor1'                                     -- location: 'sensor1', 'sensor2', 'both' / 位置
);
```

---

## 📋 Field-by-Field Explanation / 字段详解

### 1. `id` (INTEGER, Primary Key)
**English:**
- Automatically generated unique ID for each detection
- Starts at 1, increments with each new record
- Used to reference this specific detection event

**中文：**
- 每次检测自动生成的唯一 ID
- 从 1 开始，每条新记录递增
- 用于引用这个特定的检测事件

**Example / 示例:** `23`

---

### 2. `timestamp` (DATETIME)
**English:**
- Exact date and time when motion was detected
- Format: `YYYY-MM-DD HH:MM:SS`
- Uses server's local timezone (Denmark UTC+1)
- Automatically generated when record is inserted

**中文：**
- 检测到运动的确切日期和时间
- 格式：`YYYY-MM-DD HH:MM:SS`（年-月-日 时:分:秒）
- 使用服务器本地时区（丹麦 UTC+1）
- 插入记录时自动生成

**Example / 示例:** `2026-01-14 10:30:45`

---

### 3. `is_hana` (BOOLEAN)
**English:**
- Did the AI model detect Hana in the video?
- Values:
  - `1` = Yes, Hana detected
  - `0` = No, not Hana (unknown cat or false trigger)
- This is the main classification result from your TFLite model

**中文：**
- AI 模型是否在视频中检测到 Hana？
- 值：
  - `1` = 是，检测到 Hana
  - `0` = 否，不是 Hana（未知的猫或误触发）
- 这是 TFLite 模型的主要分类结果

**Example / 示例:** `1` (Hana detected / 检测到 Hana)

---

### 4. `confidence` (REAL)
**English:**
- How confident is the AI model about its prediction?
- Range: `0.0` to `1.0` (0% to 100%)
- Higher number = more confident
- Comes from TFLite model's softmax probability output

**中文：**
- AI 模型对其预测的置信度是多少？
- 范围：`0.0` 到 `1.0`（0% 到 100%）
- 数字越高 = 越自信
- 来自 TFLite 模型的 softmax 概率输出

**Examples / 示例:**
- `0.873` = 87.3% confident it's Hana / 87.3% 确信是 Hana
- `0.921` = 92.1% confident it's NOT Hana / 92.1% 确信不是 Hana
- `0.550` = 55% confident (low confidence, uncertain) / 55% 置信度（低置信度，不确定）

---

### 5. `photo_path` (TEXT)
**English:**
- Full file path to the recorded video on Pi
- Video format: `.h264` (5 seconds, 1280x720, 15fps)
- Filename includes timestamp to avoid duplicates
- This video is what the Python model analyzed

**中文：**
- 树莓派上录制视频的完整文件路径
- 视频格式：`.h264`（5 秒，1280x720，15fps）
- 文件名包含时间戳以避免重复
- Python 模型分析的就是这个视频

**Example / 示例:**  
`/home/tian/cat_videos/cat_2026-01-14T10-30-45-123Z.h264`

**Breakdown / 分解:**
- `/home/tian/cat_videos/` = Directory / 目录
- `cat_` = Prefix / 前缀
- `2026-01-14T10-30-45-123Z` = Timestamp / 时间戳
- `.h264` = Video format / 视频格式

---

### 6. `color_features` (TEXT, NULL)
**English:**
- Reserved for future use (originally for color-based detection)
- Currently not used (model uses deep learning instead)
- Can store JSON data if needed later

**中文：**
- 预留供将来使用（原用于基于颜色的检测）
- 目前未使用（模型使用深度学习）
- 如需要可以存储 JSON 数据

**Value / 值:** `NULL` (not used / 未使用)

---

### 7. `sensor1` (BOOLEAN)
**English:**
- Did the Door sensor (Pin 2) detect motion?
- Values:
  - `1` = Yes, door sensor triggered
  - `0` = No, door sensor did not trigger
- Helps you know which area had activity

**中文：**
- 门传感器（针脚 2）是否检测到运动？
- 值：
  - `1` = 是，门传感器触发
  - `0` = 否，门传感器未触发
- 帮助您了解哪个区域有活动

**Example / 示例:** `1` (Door sensor triggered / 门传感器触发)

---

### 8. `sensor2` (BOOLEAN)
**English:**
- Did the Window sensor (Pin 4) detect motion?
- Values:
  - `1` = Yes, window sensor triggered
  - `0` = No, window sensor did not trigger
- Can be triggered simultaneously with sensor1

**中文：**
- 窗传感器（针脚 4）是否检测到运动？
- 值：
  - `1` = 是，窗传感器触发
  - `0` = 否，窗传感器未触发
- 可以与 sensor1 同时触发

**Example / 示例:** `0` (Window sensor not triggered / 窗传感器未触发)

---

### 9. `location` (TEXT)
**English:**
- Summary of which sensor(s) triggered
- Possible values:
  - `'sensor1'` = Only door sensor
  - `'sensor2'` = Only window sensor
  - `'both'` = Both sensors at same time
  - `'unknown'` = Cannot determine
- Makes queries easier than checking sensor1/sensor2 booleans

**中文：**
- 哪个传感器触发的摘要
- 可能的值：
  - `'sensor1'` = 仅门传感器
  - `'sensor2'` = 仅窗传感器
  - `'both'` = 两个传感器同时
  - `'unknown'` = 无法确定
- 比检查 sensor1/sensor2 布尔值更容易查询

**Examples / 示例:**
- `'sensor1'` = Hana came through door / Hana 从门进来
- `'both'` = Hana triggered both sensors / Hana 触发了两个传感器

---

## 📊 Real Example Scenarios / 真实场景示例

### Scenario 1: Hana enters through door / 场景 1：Hana 从门进入

```javascript
// Data sent to saveDetection() / 发送到 saveDetection() 的数据
{
  photoPath: '/home/tian/cat_videos/cat_2026-01-14T14-22-10-456Z.h264',
  isHana: true,        // ✅ Model detected Hana / 模型检测到 Hana
  confidence: 0.891,   // 89.1% confident / 89.1% 置信度
  colorFeatures: null,
  sensor1: true,       // Door sensor triggered / 门传感器触发
  sensor2: false,      // Window sensor not triggered / 窗传感器未触发
  location: 'sensor1'  // Summary: door / 摘要：门
}
```

**Database saves / 数据库保存:**
```sql
id: 45
timestamp: 2026-01-14 14:22:10
is_hana: 1
confidence: 0.891
photo_path: /home/tian/cat_videos/cat_2026-01-14T14-22-10-456Z.h264
color_features: NULL
sensor1: 1
sensor2: 0
location: 'sensor1'
```

**Dashboard shows / 仪表板显示:**
```
🐱 Hana detected! (89.1%)
From: Door (Pin 2)
Time: 2:22 PM
```

---

### Scenario 2: Unknown cat at window / 场景 2：未知的猫在窗边

```javascript
// Data sent to saveDetection() / 发送到 saveDetection() 的数据
{
  photoPath: '/home/tian/cat_videos/cat_2026-01-14T16-05-33-789Z.h264',
  isHana: false,       // ❌ Not Hana / 不是 Hana
  confidence: 0.923,   // 92.3% confident it's NOT Hana / 92.3% 确信不是 Hana
  colorFeatures: null,
  sensor1: false,      // Door sensor not triggered / 门传感器未触发
  sensor2: true,       // Window sensor triggered / 窗传感器触发
  location: 'sensor2'  // Summary: window / 摘要：窗户
}
```

**Database saves / 数据库保存:**
```sql
id: 46
timestamp: 2026-01-14 16:05:33
is_hana: 0
confidence: 0.923
photo_path: /home/tian/cat_videos/cat_2026-01-14T16-05-33-789Z.h264
color_features: NULL
sensor1: 0
sensor2: 1
location: 'sensor2'
```

**Dashboard shows / 仪表板显示:**
```
❓ Unknown (92.3%)
From: Window (Pin 4)
Time: 4:05 PM
```

---

### Scenario 3: Hana runs through both sensors / 场景 3：Hana 跑过两个传感器

```javascript
// Data sent to saveDetection() / 发送到 saveDetection() 的数据
{
  photoPath: '/home/tian/cat_videos/cat_2026-01-14T18-40-15-321Z.h264',
  isHana: true,        // ✅ Model detected Hana / 模型检测到 Hana
  confidence: 0.856,   // 85.6% confident / 85.6% 置信度
  colorFeatures: null,
  sensor1: true,       // Door sensor triggered / 门传感器触发
  sensor2: true,       // Window sensor also triggered / 窗传感器也触发
  location: 'both'     // Summary: both sensors / 摘要：两个传感器
}
```

**Database saves / 数据库保存:**
```sql
id: 47
timestamp: 2026-01-14 18:40:15
is_hana: 1
confidence: 0.856
photo_path: /home/tian/cat_videos/cat_2026-01-14T18-40-15-321Z.h264
color_features: NULL
sensor1: 1
sensor2: 1
location: 'both'
```

**Dashboard shows / 仪表板显示:**
```
🐱 Hana detected! (85.6%)
From: Door + Window (BOTH)
Time: 6:40 PM
```

---

## 🗄️ Querying the Database / 查询数据库

### View all Hana detections / 查看所有 Hana 检测

```bash
# Connect to database / 连接数据库
sqlite3 ~/H4.PI/data/cat_detections.db

# Query / 查询
SELECT id, timestamp, confidence, location 
FROM detections 
WHERE is_hana = 1 
ORDER BY timestamp DESC 
LIMIT 10;
```

**Output / 输出:**
```
id  timestamp            confidence  location
--  -------------------  ----------  --------
47  2026-01-14 18:40:15  0.856       both
45  2026-01-14 14:22:10  0.891       sensor1
42  2026-01-14 09:15:22  0.834       sensor1
...
```

---

### Count detections by sensor / 按传感器统计检测次数

```sql
-- How many times each sensor triggered / 每个传感器触发多少次
SELECT 
  location,
  COUNT(*) as count,
  AVG(confidence) as avg_confidence
FROM detections
WHERE is_hana = 1
GROUP BY location;
```

**Output / 输出:**
```
location   count  avg_confidence
---------  -----  --------------
sensor1    15     0.872
sensor2    3      0.845
both       2      0.861
```

**Interpretation / 解释:**
- Hana usually enters through door (sensor1) / Hana 通常从门进入（sensor1）
- Rarely uses window (sensor2) / 很少使用窗户（sensor2）
- Sometimes triggers both sensors / 有时触发两个传感器

---

### Find videos with low confidence / 查找低置信度视频

```sql
-- Videos where model was uncertain / 模型不确定的视频
SELECT id, timestamp, is_hana, confidence, photo_path
FROM detections
WHERE confidence < 0.7
ORDER BY confidence ASC;
```

**Use case / 用例:**  
These videos might need manual review to improve model training.  
这些视频可能需要人工审查以改进模型训练。

---

## 📈 Statistics Table / 统计表

### Daily Summary / 每日摘要

```sql
-- Table: statistics
SELECT * FROM statistics ORDER BY date DESC LIMIT 7;
```

**Output / 输出:**
```
date        hana_visits  other_visits
----------  -----------  ------------
2026-01-14  12           4
2026-01-13  8            2
2026-01-12  15           6
...
```

**Explanation / 说明:**
- `hana_visits`: Times Hana was detected / 检测到 Hana 的次数
- `other_visits`: Times unknown cat was detected / 检测到未知猫的次数
- Automatically updated by `updateStatistics()` / 由 `updateStatistics()` 自动更新

---

## 🔄 Complete Code Flow / 完整代码流程

### Step-by-Step / 分步说明

```javascript
// 📁 File: server/services/mqttService.js
// 文件：server/services/mqttService.js

// 1️⃣ Receive MQTT message / 接收 MQTT 消息
mqttClient.on('message', async (topic, message) => {
  const motionData = JSON.parse(message.toString());
  // motionData = { sensor1: true, sensor2: false, location: 'sensor1' }
  
  // 2️⃣ Record video / 录制视频
  const videoPath = await capturePhoto();
  // videoPath = '/home/tian/cat_videos/cat_2026-01-14T...h264'
  
  // 3️⃣ Analyze with AI model / 使用 AI 模型分析
  const analysis = await analyzeCat(videoPath);
  // analysis = { isHana: true, confidence: 0.87, ... }
  
  // 4️⃣ Save to database / 保存到数据库
  const detectionId = await saveDetection({
    photoPath: videoPath,              // Video file path / 视频文件路径
    isHana: analysis.isHana,           // AI result / AI 结果
    confidence: analysis.confidence,   // AI confidence / AI 置信度
    colorFeatures: null,               // Not used / 未使用
    sensor1: motionData.sensor1,       // Door sensor / 门传感器
    sensor2: motionData.sensor2,       // Window sensor / 窗传感器
    location: motionData.location      // 'sensor1' / 'sensor2' / 'both'
  });
  // detectionId = 23 (database ID / 数据库 ID)
  
  // 5️⃣ Notify dashboard / 通知仪表板
  io.emit('cat-detection', {
    id: detectionId,
    timestamp: new Date().toISOString(),
    isHana: analysis.isHana,
    confidence: analysis.confidence,
    photoUrl: `/cat-videos/${path.basename(videoPath)}`,
    message: `${analysis.isHana ? '🐱 Hana!' : '❓ Unknown'}`,
    sensor1: motionData.sensor1,
    sensor2: motionData.sensor2,
    location: motionData.location
  });
});
```

---

## 🎯 Summary / 总结

### What You Get / 您获得的内容

**English:**
After motion is detected, the database stores:
1. ✅ **Unique ID** - Sequential number for each detection
2. ✅ **Timestamp** - Exact time of detection
3. ✅ **AI Result** - Is it Hana? (true/false)
4. ✅ **Confidence** - How sure is the AI? (0-1)
5. ✅ **Video File Path** - Where the 5-second video is stored
6. ✅ **Sensor Data** - Which sensor(s) triggered (door/window/both)
7. ✅ **Location Summary** - Easy-to-query location field

**中文：**
检测到运动后，数据库存储：
1. ✅ **唯一 ID** - 每次检测的序号
2. ✅ **时间戳** - 检测的确切时间
3. ✅ **AI 结果** - 是否是 Hana？（true/false）
4. ✅ **置信度** - AI 的确信程度？（0-1）
5. ✅ **视频文件路径** - 5 秒视频存储位置
6. ✅ **传感器数据** - 哪个传感器触发（门/窗/两者）
7. ✅ **位置摘要** - 易于查询的位置字段

---

## 🔍 Viewing Your Data / 查看您的数据

### On Pi via SSH / 通过 SSH 在树莓派上

```bash
# Connect to Pi / 连接到树莓派
ssh tian@100.82.69.79

# Open database / 打开数据库
sqlite3 ~/H4.PI/data/cat_detections.db

# View recent detections / 查看最近的检测
SELECT * FROM detections ORDER BY timestamp DESC LIMIT 5;

# Exit / 退出
.quit
```

### On Dashboard Web UI / 在仪表板网页界面

The dashboard automatically shows:
- Recent detections with photos
- Hana vs Unknown classification
- Confidence percentage
- Which sensor triggered

仪表板自动显示：
- 带照片的最近检测
- Hana 与未知分类
- 置信度百分比
- 哪个传感器触发

---

*For more information, see:*
- [databaseService.js](../server/services/databaseService.js) - Database code / 数据库代码
- [mqttService.js](../server/services/mqttService.js) - Motion detection workflow / 运动检测工作流
- [catDetectionService.js](../server/services/catDetectionService.js) - AI analysis / AI 分析
