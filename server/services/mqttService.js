const mqtt = require('mqtt');
const path = require('path');
const { capturePhoto } = require('./cameraService');
const { analyzeCat } = require('./catDetectionService'); // ✅ ENABLED: Model ready!
const { saveDetection } = require('./databaseService');

let mqttClient = null;

/**
 * Initialize MQTT subscriber on Pi
 * Listens for motion events from Arduino
 */
function initializeMQTT(io) {
  // Connect to cloud Mosquitto broker on Pi
  mqttClient = mqtt.connect('mqtt://broker.hivemq.com:1883');

  mqttClient.on('connect', () => {
    console.log('🦟 MQTT connected');
    
    // Subscribe to motion topic
    mqttClient.subscribe('hana/motion/detected', (err) => {
      if (err) {
        console.error('❌ MQTT subscribe failed:', err);
      } else {
        console.log('✅ Subscribed to: hana/motion/detected');
      }
    });
    
    // Subscribe to Arduino status for remote monitoring
    mqttClient.subscribe('hana/arduino/status', (err) => {
      if (err) {
        console.error('❌ Status subscribe failed:', err);
      } else {
        console.log('✅ Subscribed to: hana/arduino/status');
      }
    });
  });
  
  mqttClient.on('message', async (topic, message) => {
    console.log(`📨 MQTT message from ${topic}:`, message.toString());
    
    if (topic === 'hana/motion/detected') {
      // Parse motion data to see which sensor triggered
      try {
        const motionData = JSON.parse(message.toString());
        await handleMotionDetection(io, motionData);
      } catch (e) {
        // Fallback for old format without JSON
        await handleMotionDetection(io, { sensor1: true, sensor2: false, location: 'sensor1' });
      }
    } else if (topic === 'hana/arduino/status') {
      // Log Arduino status (replaces Serial.println when Arduino is deployed)
      try {
        const status = JSON.parse(message.toString());
        console.log(`🤖 Arduino: ${status.message} (RSSI: ${status.wifi_rssi} dBm, IP: ${status.ip})`);
        
        // Forward to Dashboard via WebSocket
        io.emit('arduino-status', status);
      } catch (e) {
        console.log('Arduino RAW:', message.toString());
      }
    }
  });
  
  mqttClient.on('error', (err) => {
    console.error('❌ MQTT error:', err);
  });
}

/**
 * Handle motion detection workflow
 */
async function handleMotionDetection(io, motionData = {}) {
  try {
    // Determine which sensor triggered
    const { sensor1, sensor2, location } = motionData;
    let triggerSource = 'Unknown';
    
    if (location === 'both') {
      triggerSource = 'Door + Window (BOTH)';
    } else if (location === 'sensor1' || sensor1) {
      triggerSource = 'Door (Pin 2)';
    } else if (location === 'sensor2' || sensor2) {
      triggerSource = 'Window (Pin 4)';
    }
    
    console.log(`🐾 Motion detected from: ${triggerSource}! Recording video...`);
    
    // Step 1: Record 5-second video clip (triggered by EITHER or BOTH sensors)
    // Camera locking is handled inside capturePhoto()
    const videoPath = await capturePhoto();  // Function name unchanged for compatibility
    const videoFilename = path.basename(videoPath);
    
    // Check if this is a shared video (camera was busy)
    const isSharedVideo = videoFilename !== `cat_${new Date().toISOString().replace(/[:.]/g, '-')}.h264`;
    
    if (isSharedVideo) {
      console.log(`📹 Camera was busy - sharing video ${videoFilename} for ${triggerSource}`);
    }
    
    // Step 2: Analyze video with trained TFLite model
    let analysis;
    try {
      analysis = await analyzeCat(videoPath);
      console.log(`🔍 Analysis: ${analysis.isHana ? 'Hana detected!' : 'No Hana'} (${(analysis.confidence * 100).toFixed(1)}% confidence)`);
    } catch (error) {
      console.error(`❌ Analysis failed for ${triggerSource}:`, error.message);
      // Broadcast error to dashboard
      io.emit('detection-error', {
        timestamp: new Date().toISOString(),
        message: `Detection analysis failed: ${error.message}`,
        trigger: triggerSource,
        videoPath: path.basename(videoPath)
      });
      return; // Don't save to database if analysis fails
    }
    
    // Step 3: Save to database (with sensor info)
    const detectionId = await saveDetection({
      photoPath: videoPath,  // Field name unchanged for DB compatibility
      isHana: analysis.isHana,
      confidence: analysis.confidence,
      colorFeatures: null,
      sensor1: sensor1 || false,
      sensor2: sensor2 || false,
      location: location || 'unknown'
    });
    
    // Step 4: Broadcast to dashboard via WebSocket
    io.emit('cat-detection', {
      id: detectionId,
      timestamp: new Date().toISOString(),
      isHana: analysis.isHana,
      confidence: analysis.confidence,
      photoUrl: `/cat-videos/${path.basename(videoPath)}`,
      message: `${analysis.isHana ? '🐱 Hana detected!' : '❓ Unknown'} from ${triggerSource}`,
      sensor1: sensor1 || false,
      sensor2: sensor2 || false,
      location: location || 'unknown'
    });
    
    console.log(`✅ Video saved: ${path.basename(videoPath)} (Trigger: ${triggerSource})`);
    
  } catch (error) {
    console.error('❌ Motion detection workflow failed:', error);
  }
}

module.exports = { initializeMQTT };
