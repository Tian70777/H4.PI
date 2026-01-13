import React from 'react';
import './ArduinoView.css';
import type { ArduinoData, CatDetection } from './types';

interface Props {
  data: ArduinoData | null;
  lastUpdate: Date | null;
  detections: CatDetection[];
}

const ArduinoView: React.FC<Props> = ({ data, lastUpdate, detections }) => {
  const SOCKET_URL = `http://${window.location.hostname || 'localhost'}:5000`;
  if (!data) {
    return (
      <div className="view-container">
        <h2>Arduino Sensor Status</h2>
        <div className="status-grid">
          <div className="status-card offline">
            <h3>Connection Status</h3>
            <div className="status-indicator">
              <span className="status-dot offline"></span>
              <span>OFFLINE</span>
            </div>
            <p className="status-info">Waiting for heartbeat from Arduino...</p>
          </div>
        </div>
      </div>
    );
  }

  const isOnline = lastUpdate && (Date.now() - lastUpdate.getTime() < 60000);
  
  // Fix NaN issue - ensure uptime is a valid number
  const uptimeSeconds = typeof data.uptime === 'number' && !isNaN(data.uptime) ? data.uptime : 0;
  const uptimeMinutes = Math.floor(uptimeSeconds / 60);
  const uptimeHours = Math.floor(uptimeMinutes / 60);
  const remainingMinutes = uptimeMinutes % 60;

  return (
    <div className="view-container">
      <h2>Arduino Sensor Dashboard</h2>
      <p className="subtitle">PIR Motion Detection System</p>

      <div className="status-grid">
        <div className={`status-card ${isOnline ? 'online' : 'offline'}`}>
          <h3>Connection Status</h3>
          <div className="status-indicator">
            <span className={`status-dot ${isOnline ? 'online' : 'offline'}`}></span>
            <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </div>
          <p className="status-info">{data.message}</p>
        </div>

        <div className="status-card">
          <h3>Uptime</h3>
          <div className="uptime-display">
            {uptimeHours > 0 && <><span className="time-value">{uptimeHours}</span>h </>}
            <span className="time-value">{remainingMinutes}</span>m
          </div>
          <p className="status-info">{uptimeSeconds}s total</p>
        </div>

        {data.wifi_rssi && (
          <div className="status-card">
            <h3>WiFi Signal</h3>
            <div className="signal-display">
              <span className="signal-value">{data.wifi_rssi} dBm</span>
              <span className={`signal-strength ${getSignalStrength(data.wifi_rssi)}`}>
                {getSignalLabel(data.wifi_rssi)}
              </span>
            </div>
          </div>
        )}

        {data.ip && (
          <div className="status-card">
            <h3>IP Address</h3>
            <div className="ip-display">{data.ip}</div>
          </div>
        )}

        <div className="status-card">
          <h3>MQTT Status</h3>
          <div className="status-indicator">
            <span className={`status-dot ${isOnline ? 'online' : 'offline'}`}></span>
            <span>{isOnline ? 'CONNECTED' : 'DISCONNECTED'}</span>
          </div>
          <p className="status-info">broker.hivemq.com</p>
        </div>

        <div className="status-card">
          <h3>Last Update</h3>
          <div className="time-display">
            {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
          </div>
          <p className="status-info">
            {lastUpdate ? `${Math.floor((Date.now() - lastUpdate.getTime()) / 1000)}s ago` : 'Waiting...'}
          </p>
        </div>
      </div>

      <div className="sensor-info">
        <h3>Sensor Configuration</h3>
        <ul>
          <li><strong>Type:</strong> PIR Motion Sensor</li>
          <li><strong>Pin:</strong> Digital Pin 2</li>
          <li><strong>Cooldown:</strong> 5 seconds</li>
          <li><strong>Heartbeat:</strong> Every 30 seconds</li>
        </ul>
      </div>

      <div className="detection-gallery">
        <h3>Recent Detections</h3>
        {detections.length === 0 ? (
          <p className="no-detections">No motion detected yet. Wave at the sensor!</p>
        ) : (
          <div className="photo-grid">
            {detections.map((detection) => (
              <div key={detection.id} className="photo-card">
                <img 
                  src={`${SOCKET_URL}${detection.photoUrl}`} 
                  alt={`Detection ${detection.id}`}
                  className="detection-photo"
                />
                <div className="photo-info">
                  <span className={`cat-label ${detection.isHana ? 'is-hana' : 'not-hana'}`}>
                    {detection.isHana ? '🐱 Hana!' : '❓ Unknown'}
                  </span>
                  <span className="confidence">{(detection.confidence * 100).toFixed(1)}%</span>
                  <span className="timestamp">{new Date(detection.timestamp).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function getSignalStrength(rssi: number): string {
  if (rssi >= -50) return 'excellent';
  if (rssi >= -60) return 'good';
  if (rssi >= -70) return 'fair';
  return 'weak';
}

function getSignalLabel(rssi: number): string {
  if (rssi >= -50) return 'Excellent';
  if (rssi >= -60) return 'Good';
  if (rssi >= -70) return 'Fair';
  return 'Weak';
}

export default ArduinoView;
