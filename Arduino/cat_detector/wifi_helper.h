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

  // Enable Static IP for consistent address (.66)
  WiFi.config(local_IP, dns, gateway, subnet);

  // Start connection - call begin() only ONCE
  WiFi.begin(ssid, pass);
  
  // Wait for connection to establish
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) { // Wait up to 15 seconds
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi Connected!");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("Gateway: ");
    Serial.println(WiFi.gatewayIP());
    
    int rssi = WiFi.RSSI();
    Serial.print("Signal Strength (RSSI): ");
    Serial.print(rssi);
    Serial.print(" dBm - ");
    
    // Signal quality indicator
    if (rssi > -50) {
      Serial.println("Excellent ✅");
    } else if (rssi > -60) {
      Serial.println("Good ✅");
    } else if (rssi > -70) {
      Serial.println("Fair ⚠️ (may disconnect)");
    } else if (rssi > -80) {
      Serial.println("Weak ⚠️ (unstable connection expected)");
    } else {
      Serial.println("Very Weak ❌ (likely to fail)");
    }
    
    return true;
  }
  
  Serial.println("\nWiFi Connection Failed.");
  Serial.println("Possible causes:");
  Serial.println("- Wrong WiFi password");
  Serial.println("- WiFi signal too weak (move Arduino closer to router)");
  Serial.println("- Router not responding");
  return false;
}

bool isWiFiConnected() {
  if (WiFi.status() == WL_CONNECTED) {
    int rssi = WiFi.RSSI();
    // Warn if signal is degrading
    if (rssi < -75) {
      Serial.print("⚠️ Warning: Weak signal (");
      Serial.print(rssi);
      Serial.println(" dBm) - may disconnect soon!");
    }
    return true;
  }
  return false;
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
