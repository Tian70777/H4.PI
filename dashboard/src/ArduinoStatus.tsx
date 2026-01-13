import React from 'react';
import './ArduinoStatus.css';
import { ArduinoData } from './types';

interface Props {
  data: ArduinoData | null;
}

const getSignalQuality = (rssi: number): string => {
  if (rssi > -50) return 'excellent';
  if (rssi > -60) return 'good';
  if (rssi > -70) return 'fair';
  if (rssi > -80) return 'weak';
  return 'very-weak';
};

const getSignalIcon = (rssi: number): string => {
  if (rssi > -50) return '📶';
  if (rssi > -60) return '📶';
  if (rssi > -70) return '📡';
  if (rssi > -80) return '⚠️';
  return '❌';
};

const ArduinoStatus: React.FC<Props> = ({ data }) => {
  if (!data) {
    return (
      <div className="card arduino-card disconnected">
        <h2>Arduino Sensor</h2>
        <div className="value">Offline</div>
        <div className="label">Waiting for heartbeat...</div>
      </div>
    );
  }

  // Format uptime properly
  const uptimeSeconds = data.uptime || 0;
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);
  const seconds = uptimeSeconds % 60;
  
  let uptimeDisplay = '';
  if (hours > 0) {
    uptimeDisplay = `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    uptimeDisplay = `${minutes}m ${seconds}s`;
  } else {
    uptimeDisplay = `${seconds}s`;
  }

  return (
    <div className="card arduino-card connected">
      <h2>Arduino Sensor</h2>
      <div className="arduino-grid">
        <div className="arduino-stat">
          <span className="label">Status</span>
          <span className="value-sm">{data.message}</span>
        </div>
        <div className="arduino-stat">
          <span className="label">Uptime</span>
          <span className="value-sm">{uptimeDisplay}</span>
        </div>
        {data.ip && (
          <div className="arduino-stat">
            <span className="label">IP</span>
            <span className="value-sm">{data.ip}</span>
          </div>
        )}
        {data.wifi_rssi && (
            <div className="arduino-stat">
                <span className="label">WiFi Signal</span>
                <span className={`value-sm signal-${getSignalQuality(data.wifi_rssi)}`}>
                  {data.wifi_rssi} dBm {getSignalIcon(data.wifi_rssi)}
                </span>
            </div>
        )}
      </div>
      <div className="last-seen">
        Last message: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default ArduinoStatus;
