// config.example.h
// COPY this file to config.h and fill in your real credentials
// config.h will be git-ignored for security

#ifndef CONFIG_H
#define CONFIG_H

// ========== WiFi Configuration ==========
const char* WIFI_HOME_SSID = "YOUR_HOME_WIFI";
const char* WIFI_HOME_PASS = "YOUR_HOME_PASSWORD";

// ========== MQTT Configuration ==========
const char* MQTT_SERVER = "100.82.69.79";  // Pi's Tailscale IP
const int MQTT_PORT = 1883;
const char* MQTT_TOPIC_MOTION = "hana/motion/detected";
const char* MQTT_TOPIC_STATUS = "hana/arduino/status";  // For remote monitoring

// ========== Pin Definitions ==========
#define PIR_PIN 2       // PIR sensor input
#define LED_PIN 13      // LED indicator

// ========== Timing Configuration ==========
const unsigned long MOTION_COOLDOWN = 5000;  // 5 seconds between detections

#endif
