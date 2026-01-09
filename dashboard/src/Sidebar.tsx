import React from 'react';
import './Sidebar.css';

interface Props {
  activeTab: 'server' | 'arduino';
  onTabChange: (tab: 'server' | 'arduino') => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<Props> = ({ activeTab, onTabChange, isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>MONITORING</h2>
        <button className="close-btn" onClick={onClose}>✕</button>
      </div>
      
      <nav className="sidebar-nav">
        <button
          className={`nav-item ${activeTab === 'server' ? 'active' : ''}`}
          onClick={() => onTabChange('server')}
        >
          <span className="icon">🍓</span>
          <span className="label">Server Status</span>
        </button>
        
        <button
          className={`nav-item ${activeTab === 'arduino' ? 'active' : ''}`}
          onClick={() => onTabChange('arduino')}
        >
          <span className="icon">🤖</span>
          <span className="label">Arduino Sensor</span>
        </button>
      </nav>
    </div>
  );
};

export default Sidebar;
