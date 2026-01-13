import { useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import './App.css'
import Sidebar from './Sidebar';
import ServerView from './ServerView';
import ArduinoView from './ArduinoView';
import { SystemData, ArduinoData, CatDetection } from './types';

// Auto-detect the Pi's address from the current URL
// Works with IP addresses (10.101.40.181) or hostnames (tianserver01.local)
// Falls back to localhost for local development
const SOCKET_URL = `http://${window.location.hostname || 'localhost'}:5000`;

function App() {
  const [data, setData] = useState<SystemData | null>(null);
  const [arduinoData, setArduinoData] = useState<ArduinoData | null>(null);
  const [arduinoLastUpdate, setArduinoLastUpdate] = useState<Date | null>(null);
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'server' | 'arduino'>('server');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [catDetections, setCatDetections] = useState<CatDetection[]>([]);

  useEffect(() => {
    // Create WebSocket connection to server
    const socket = io(SOCKET_URL);

    // Handle connection
    socket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
    });

    // Listen for 'stats' event from server (Pi System)
    socket.on('stats', (receivedData: SystemData) => {
      setData(receivedData);
    });

    // Listen for 'arduino-status' event from server (Arduino via MQTT)
    socket.on('arduino-status', (status: ArduinoData) => {
        console.log('Received Arduino status:', status);
        setArduinoData(status);
        setArduinoLastUpdate(new Date());
    });

    // Listen for 'cat-detection' event from server (motion detection)
    socket.on('cat-detection', (detection: CatDetection) => {
        console.log('Cat detection:', detection);
        setCatDetections(prev => [detection, ...prev].slice(0, 10)); // Keep last 10
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    // Check for stale Arduino status every 10 seconds
    const staleCheckInterval = setInterval(() => {
      if (arduinoLastUpdate && (Date.now() - arduinoLastUpdate.getTime() > 60000)) {
        console.warn('Arduino status is stale (>60s old)');
      }
    }, 10000);

    // Cleanup on component unmount
    return () => {
      socket.disconnect();
      clearInterval(staleCheckInterval);
    };
  }, [arduinoLastUpdate]);

  return (
    <div className="dashboard">
      <div className="scanlines"></div>
      {!sidebarOpen && (
        <button className="sidebar-toggle-btn" onClick={() => setSidebarOpen(true)}>
          ☰
        </button>
      )}
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      <div className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <header className="header">
          <h1>IoT Monitoring Dashboard</h1>
          <div className="connection-status">
            <span className={connected ? 'status-dot connected' : 'status-dot disconnected'}></span>
            <span>{connected ? 'Server Online' : 'Server Offline'}</span>
          </div>
        </header>

        {activeTab === 'server' ? (
          <ServerView data={data} />
        ) : (
          <ArduinoView data={arduinoData} lastUpdate={arduinoLastUpdate} detections={catDetections} />
        )}
      </div>
    </div>
  )
}

export default App
