import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import './App.css'

interface SystemData {
  load: string;
  temperature: string;
  memoryUsage: string;
  totalMemory: string;
  ipAddress: string;
  uptime: string;
}

// Auto-detect the Pi's address from the current URL
// Works with IP addresses (10.101.40.181) or hostnames (tianserver01.local)
// Falls back to localhost for local development
const SOCKET_URL = `http://${window.location.hostname || 'localhost'}:5000`;

function App() {
  const [data, setData] = useState<SystemData | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Create WebSocket connection to server
    const socket = io(SOCKET_URL);

    // Handle connection
    socket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
    });

    // Listen for 'stats' event from server
    socket.on('stats', (receivedData: SystemData) => {
      console.log('Received stats:', receivedData);
      setData(receivedData);
    });

    // Handle disconnectionxinjiaPo220789
    
    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    // Cleanup on component unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  if (!data) {
    return (
      <div className="loading">
        {connected ? 'Waiting for data...' : 'Connecting to Pi...'}
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="scanlines"></div>
      <header className="header">
        <h1>Raspberry Pi Dashboard</h1>
        <p className="uptime">Last Updated: {data.uptime}</p>
      </header>

      <div className="grid">
        <div className="card">
          <h2>System Load</h2>
          <div className="value">{data.load}%</div>
          <div className="label">CPU Usage</div>
        </div>

        <div className="card">
          <h2>Temperature</h2>
          <div className="value">{data.temperature}°C</div>
          <div className="label">CPU Temp</div>
        </div>

        <div className="card">
          <h2>Memory Usage</h2>
          <div className="value">{data.memoryUsage}%</div>
          <div className="label">of {data.totalMemory}</div>
        </div>

        <div className="card">
          <h2>Network</h2>
          <div className="value ip">{data.ipAddress}</div>
          <div className="label">IP Address</div>
        </div>
      </div>

      <div className="info-box">
        <div className="status-indicator">
          <span className={connected ? 'status-dot connected' : 'status-dot disconnected'}></span>
          {connected ? 'Connected to Pi' : 'Disconnected'}
        </div>
        <p>
          Real-time data from Raspberry Pi via WebSocket. 
          Updates every 2 seconds automatically. check!
        </p>
      </div>
    </div>
  )
}

export default App
