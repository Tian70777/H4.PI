import React from 'react';

interface SystemData {
  load: string;
  temperature: string;
  memoryUsage: string;
  totalMemory: string;
  ipAddress: string;
  uptime: string;
}

interface Props {
  data: SystemData | null;
}

const ServerView: React.FC<Props> = ({ data }) => {
  if (!data) {
    return (
      <div className="view-container">
        <h2>Server Status</h2>
        <div className="card disconnected">
          <h3>Pi System</h3>
          <div className="value">OFFLINE</div>
          <div className="label">Waiting for connection...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="view-container">
      <h2>Server System Status</h2>
      <p className="subtitle">Last Updated: {data.uptime}</p>
      
      <div className="grid">
        <div className="card">
          <h3>System Load</h3>
          <div className="value">{data.load}%</div>
          <div className="label">CPU Usage</div>
        </div>

        <div className="card">
          <h3>Temperature</h3>
          <div className="value">{data.temperature}°C</div>
          <div className="label">CPU Temp</div>
        </div>

        <div className="card">
          <h3>Memory Usage</h3>
          <div className="value">{data.memoryUsage}%</div>
          <div className="label">of {data.totalMemory}</div>
        </div>

        <div className="card">
          <h3>Network</h3>
          <div className="value ip">{data.ipAddress}</div>
          <div className="label">IP Address</div>
        </div>
      </div>
    </div>
  );
};

export default ServerView;
