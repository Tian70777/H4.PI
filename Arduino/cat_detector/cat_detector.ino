// cat_detector.ino
// Simple PIR motion detector that sends MQTT to Pi

#include <WiFiS3.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "config.h"
#include "wifi_helper.h"
#include "mqtt_helper.h"

WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

unsigned long lastMotionTime = 0;
unsigned long lastStatusTime = 0;
const unsigned long STATUS_INTERVAL = 30000; // Send status every 30 seconds
bool motionDetected = false;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("🐱 Hana Cat Detector Starting...");
  
  // Setup pins
  pinMode(PIR_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);
  
  // Connect to WiFi
  if (!connectToWiFi(WIFI_HOME_SSID, WIFI_HOME_PASS)) {
    Serial.println("❌ WiFi failed initially! Will retry in loop...");
    // Don't freeze here, let the loop() handle reconnection
  } else {
    blinkLED(2);  // 2 blinks = WiFi connected
  }
  
  // Setup MQTT
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  
  if (!connectToMQTT("HanaCatDetector")) {
    Serial.println("❌ MQTT failed! Check Pi Mosquitto is running");
    // Slow blink = MQTT error
    for(int i=0; i<5; i++) {
      digitalWrite(LED_PIN, HIGH);
      delay(1000);
      digitalWrite(LED_PIN, LOW);
      delay(1000);
    }
  } else {
    sendStatus("Arduino started - WiFi and MQTT connected");
  }
  
  Serial.println("✅ System Ready!");
  blinkLED(3);  // 3 blinks to indicate ready
}

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
      if (connectToMQTT("HanaCatDetector")) {
        sendStatus("WiFi Reconnected - Online");
      }
    }
  }
  
  // Maintain MQTT connection
  if (!mqttClient.connected()) {
    Serial.println("⚠️ MQTT lost! Reconnecting...");
    reconnectMQTT(nullptr);
  }
  mqttClient.loop();
  
  // Periodic Status Update (Heartbeat)
  if (currentMillis - lastStatusTime >= STATUS_INTERVAL) {
    lastStatusTime = currentMillis;
    sendStatus("Heartbeat - System Active");
  }
  
  // Read PIR sensor
  int pirState = digitalRead(PIR_PIN);
  
  if (pirState == HIGH && !motionDetected) {
    // Motion detected!
    unsigned long currentTime = millis();
    
    // Check cooldown (avoid spam)
    if (currentTime - lastMotionTime > MOTION_COOLDOWN) {
      motionDetected = true;
      lastMotionTime = currentTime;
      
      Serial.println("🐾 Motion detected!");
      digitalWrite(LED_PIN, HIGH);
      
      // Send MQTT message
      sendMotionAlert();
      
      delay(1000);  // Keep LED on for 1 second
      digitalWrite(LED_PIN, LOW);
    }
  }
  
  if (pirState == LOW) {
    motionDetected = false;
  }
  
  delay(100);
}

