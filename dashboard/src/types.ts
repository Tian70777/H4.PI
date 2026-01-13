// Shared type definitions for the dashboard

export interface SystemData {
  load: string;
  temperature: string;
  memoryUsage: string;
  totalMemory: string;
  ipAddress: string;
  uptime: string;
}

export interface ArduinoData {
  message: string;
  uptime: number;
  wifi_rssi?: number;
  ip?: string;
}

export interface CatDetection {
  id: number;
  timestamp: string;
  isHana: boolean;
  confidence: number;
  photoUrl: string;
}
