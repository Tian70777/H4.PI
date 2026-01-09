#ifndef MQTT_HELPER_H
#define MQTT_HELPER_H

#include <WiFiS3.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include "config.h"

// Forward declaration of the client from main file if needed, 
// strictly speaking we should pass it, but since we are using extern in .ino usually...
// Actually, the main file defines 'mqttClient'. We should use 'extern' here.
extern PubSubClient mqttClient;

void sendStatus(const char* msg) {
  StaticJsonDocument<200> doc;
  doc["type"] = "status";
  doc["message"] = msg;
  doc["wifi_rssi"] = WiFi.RSSI();
  doc["ip"] = WiFi.localIP().toString();
  
  char buffer[256];
  serializeJson(doc, buffer);
  
  mqttClient.publish(MQTT_TOPIC_STATUS, buffer);
  Serial.print("Sent Status: ");
  Serial.println(msg);
}

void sendMotionAlert() {
  StaticJsonDocument<200> doc;
  doc["type"] = "motion";
  doc["active"] = true;
  doc["timestamp"] = millis();
  
  char buffer[256];
  serializeJson(doc, buffer);
  
  mqttClient.publish(MQTT_TOPIC_MOTION, buffer);
  Serial.println("Sent MQTT Motion Alert");
}

bool connectToMQTT(const char* clientId) {
  Serial.print("Connecting to MQTT...");
  if (mqttClient.connect(clientId)) {
    Serial.println("connected");
    mqttClient.subscribe(MQTT_TOPIC_CONTROL);
    return true;
  } else {
    Serial.print("failed, rc=");
    Serial.print(mqttClient.state());
    return false;
  }
}

void reconnectMQTT(void (*callback)(char*, uint8_t*, unsigned int)) {
  // Loop until we're reconnected
  while (!mqttClient.connected()) {
    Serial.print("Attempting MQTT connection...");
    // Create a random client ID
    String clientId = "HanaCatDetector-";
    clientId += String(random(0xffff), HEX);
    
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("connected");
      // Once connected, publish an announcement...
      sendStatus("Reconnected");
      // ... and resubscribe
      mqttClient.subscribe(MQTT_TOPIC_CONTROL);
    } else {
      Serial.print("failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

#endif
