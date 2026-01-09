const mqtt = require('mqtt');
const path = require('path');
const { capturePhoto } = require('./cameraService');
const { analyzeCat } = require('./catDetectionService');
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
      await handleMotionDetection(io);
    } else if (topic === 'hana/arduino/status') {
      // Log Arduino status (replaces Serial.println when Arduino is deployed)
      try {
        const status = JSON.parse(message.toString());
        console.log(`🤖 Arduino: ${status.msg} (uptime: ${status.uptime}s)`);
        
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
async function handleMotionDetection(io) {
  try {
    console.log('🐾 Motion detected! Starting cat detection workflow...');
    
    // Step 1: Capture photo
    const photoPath = await capturePhoto();
    
    // Step 2: Analyze if it's Hana
    const analysis = await analyzeCat(photoPath);
    
    // Step 3: Save to database
    const detectionId = await saveDetection({
      photoPath: photoPath,
      isHana: analysis.isHana,
      confidence: analysis.confidence,
      colorFeatures: JSON.stringify(analysis.colorFeatures)
    });
    
    // Step 4: Broadcast to dashboard via WebSocket
    io.emit('cat-detection', {
      id: detectionId,
      timestamp: new Date().toISOString(),
      isHana: analysis.isHana,
      confidence: analysis.confidence,
      photoUrl: `/cat-photos/${path.basename(photoPath)}`
    });
    
    if (analysis.isHana) {
      console.log(`✅ Hana detected! Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
    } else {
      console.log(`❌ Not Hana (confidence: ${(analysis.confidence * 100).toFixed(1)}%)`);
    }
    
  } catch (error) {
    console.error('❌ Motion detection workflow failed:', error);
  }
}

module.exports = { initializeMQTT };
