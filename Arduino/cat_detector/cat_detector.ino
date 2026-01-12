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
bool motionDetected1 = false;
bool motionDetected2 = false;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("🐱 Hana Cat Detector Starting...");
  
  // Setup pins
  pinMode(PIR_PIN_1, INPUT);
  pinMode(PIR_PIN_2, INPUT);
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
    Serial.println("⚠️ WiFi lost! Reconnecting continuously until found...");
    digitalWrite(LED_PIN, HIGH); // LED on during reconnect
    
    // Keep trying forever until WiFi is restored
    while (WiFi.status() != WL_CONNECTED) {
      Serial.print(".");
      connectToWiFi(WIFI_HOME_SSID, WIFI_HOME_PASS);
      
      if (WiFi.status() != WL_CONNECTED) {
        delay(5000); // Wait 5 seconds between retries
      }
    }
    
    digitalWrite(LED_PIN, LOW);
    Serial.println("\n✅ WiFi restored!");
    
    // After WiFi reconnects, reconnect MQTT
    if (connectToMQTT("HanaCatDetector")) {
      sendStatus("WiFi Reconnected - Online");
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
  
  // Read both PIR sensors
  int pirState1 = digitalRead(PIR_PIN_1);
  int pirState2 = digitalRead(PIR_PIN_2);
  
  // Check if either sensor detects motion
  if ((pirState1 == HIGH && !motionDetected1) || (pirState2 == HIGH && !motionDetected2)) {
    // Motion detected!
    unsigned long currentTime = millis();
    
    // Check cooldown (avoid spam)
    if (currentTime - lastMotionTime > MOTION_COOLDOWN) {
      lastMotionTime = currentTime;
      
      // Determine which sensor(s) triggered
      bool sensor1 = (pirState1 == HIGH);
      bool sensor2 = (pirState2 == HIGH);
      
      if (sensor1) motionDetected1 = true;
      if (sensor2) motionDetected2 = true;
      
      // Print which sensor(s) detected motion
      Serial.print("🐾 Motion detected on: ");
      if (sensor1 && sensor2) {
        Serial.println("BOTH sensors!");
      } else if (sensor1) {
        Serial.println("Sensor 1 (Pin 2)");
      } else {
        Serial.println("Sensor 2 (Pin 4)");
      }
      
      digitalWrite(LED_PIN, HIGH);
      
      // Send MQTT message with sensor info
      sendMotionAlert(sensor1, sensor2);
      
      delay(1000);  // Keep LED on for 1 second
      digitalWrite(LED_PIN, LOW);
    }
  }
  
  // Reset motion flags when sensors go low
  if (pirState1 == LOW) {
    motionDetected1 = false;
  }
  if (pirState2 == LOW) {
    motionDetected2 = false;
  }
  
  delay(100);
}

