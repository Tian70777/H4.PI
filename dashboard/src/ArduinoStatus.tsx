import React from 'react';
import './ArduinoStatus.css';

interface ArduinoData {
  msg: string;
  uptime: number;
  wifi_rssi?: number;
  ip?: string;
  timestamp?: number;
}

interface Props {
  data: ArduinoData | null;
}

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

  const uptimeMinutes = Math.floor(data.uptime / 60);

  return (
    <div className="card arduino-card connected">
      <h2>Arduino Sensor</h2>
      <div className="arduino-grid">
        <div className="arduino-stat">
          <span className="label">Status</span>
          <span className="value-sm">{data.msg}</span>
        </div>
        <div className="arduino-stat">
          <span className="label">Uptime</span>
          <span className="value-sm">{uptimeMinutes}m</span>
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
                <span className="value-sm">{data.wifi_rssi} dBm</span>
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
