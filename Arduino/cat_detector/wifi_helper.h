#ifndef WIFI_HELPER_H
#define WIFI_HELPER_H

#include <WiFiS3.h>
#include "config.h"

bool connectToWiFi(const char* ssid, const char* pass) {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  if (WiFi.status() == WL_NO_MODULE) {
    Serial.println("Communication with WiFi module failed!");
    return false;
  }

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 5) {
    WiFi.begin(ssid, pass);
    delay(5000);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    return true;
  }
  
  Serial.println("\nWiFi Connection Failed.");
  return false;
}

bool isWiFiConnected() {
  return WiFi.status() == WL_CONNECTED;
}

void blinkLED(int times) {
  for(int i=0; i<times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(200);
    digitalWrite(LED_PIN, LOW);
    delay(200);
  }
}

#endif
