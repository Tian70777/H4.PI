const int PIR_PIN = 2;     // PIR OUT -> D2
const int LED_PIN = 13;    // LED (or built-in L LED) -> D13

int lastMotion = -1;
unsigned long lastPeriodicPrintMs = 0;

void setup() {
  pinMode(PIR_PIN, INPUT_PULLDOWN);  // stabilizes input
  pinMode(LED_PIN, OUTPUT);

  Serial.begin(115200);
  delay(200);

  Serial.println("=== PIR Debug Start ===");
  Serial.println("Serial baud: 115200 (set Serial Monitor to 115200!)");
  Serial.println("Warming up PIR for 30s...");
  delay(30000);  // PIR warm-up
  Serial.println("Ready. Move your hand in front of PIR.");
}

void loop() {
  int motion = digitalRead(PIR_PIN);

  // LED follows PIR (ON when motion=1)
  digitalWrite(LED_PIN, motion);

  // Print only when PIR state changes
  if (motion != lastMotion) {
    lastMotion = motion;
    Serial.print("STATE CHANGE: motion=");
    Serial.println(motion);   // 0 or 1
  }

  // Print periodically every 1s (heartbeat)
  unsigned long now = millis();
  if (now - lastPeriodicPrintMs >= 1000) {
    lastPeriodicPrintMs = now;
    Serial.print("Heartbeat: motion=");
    Serial.println(motion);
  }

  delay(200);
}
