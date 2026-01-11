#ifndef WIFI_HELPER_H
#define WIFI_HELPER_H

#include <WiFiS3.h>
#include "config.h"

// Define Static IP settings
// This ensures the device always uses 192.168.0.66 so you can ping it
IPAddress local_IP(192, 168, 0, 66);
IPAddress dns(8, 8, 8, 8);             // Google DNS
IPAddress gateway(192, 168, 0, 1);
IPAddress subnet(255, 255, 255, 0);

bool connectToWiFi(const char* ssid, const char* pass) {
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  
  if (WiFi.status() == WL_NO_MODULE) {
    Serial.println("Communication with WiFi module failed!");
    return false;
  }

  // Disconnect any previous connection attempts
  WiFi.disconnect();
  delay(100);

  // Configuration for Static IP (Respects order: IP, DNS, Gateway, Subnet)
  WiFi.config(local_IP, dns, gateway, subnet);

  // Start connection - call begin() only ONCE
  WiFi.begin(ssid, pass);
  
  // Wait for connection to establish
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) { // Wait up to 10 seconds (20*500ms)
    delay(500);
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
