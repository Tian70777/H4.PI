import { useState, useEffect } from 'react';
import './HistoryView.css';

interface Detection {
  id: number;
  timestamp: string;
  is_hana: number;
  confidence: number;
  photo_path: string;
  sensor1: number;
  sensor2: number;
  location: string;
}

interface HistoryViewProps {
  serverUrl: string;
}

export default function HistoryView({ serverUrl }: HistoryViewProps) {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [filterHana, setFilterHana] = useState<'all' | 'hana' | 'other'>('all');
  const [filterSensor, setFilterSensor] = useState<'all' | 'sensor1' | 'sensor2' | 'both'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [limit, setLimit] = useState(50);
  
  // Video player
  const [selectedVideo, setSelectedVideo] = useState<Detection | null>(null);

  useEffect(() => {
    fetchDetections();
  }, [filterHana, filterSensor, startDate, endDate, limit]);

  const fetchDetections = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Build query params
      const params = new URLSearchParams();
      params.append('limit', limit.toString());
      
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      if (filterHana !== 'all') {
        params.append('isHana', filterHana === 'hana' ? 'true' : 'false');
      }
      
      if (filterSensor !== 'all') {
        params.append('sensor', filterSensor);
      }
      
      const response = await fetch(`${serverUrl}/api/detections?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setDetections(data.detections);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load detections');
      console.error('Failed to fetch detections:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-DK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getSensorLabel = (location: string) => {
    switch (location) {
      case 'sensor1': return '🚪 Door';
      case 'sensor2': return '🪟 Window';
      case 'both': return '🚪🪟 Both';
      default: return '❓ Unknown';
    }
  };

  const getVideoUrl = (photoPath: string) => {
    const filename = photoPath.split('/').pop();
    return `${serverUrl}/cat-videos/${filename}`;
  };

  return (
    <div className="history-view">
      <div className="history-header">
        <h1>📊 Detection History</h1>
        <p className="subtitle">View all cat detection records</p>
      </div>

      {/* Filters */}
      <div className="filters-panel">
        <div className="filter-group">
          <label>Category:</label>
          <select value={filterHana} onChange={(e) => setFilterHana(e.target.value as any)}>
            <option value="all">All Detections</option>
            <option value="hana">🐱 Hana Only</option>
            <option value="other">❓ Unknown Only</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Sensor:</label>
          <select value={filterSensor} onChange={(e) => setFilterSensor(e.target.value as any)}>
            <option value="all">All Sensors</option>
            <option value="sensor1">🚪 Door (Pin 2)</option>
            <option value="sensor2">🪟 Window (Pin 4)</option>
            <option value="both">🚪🪟 Both</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Start Date:</label>
          <input 
            type="date" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>End Date:</label>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>Limit:</label>
          <select value={limit} onChange={(e) => setLimit(parseInt(e.target.value))}>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
          </select>
        </div>

        <button className="refresh-btn" onClick={fetchDetections}>
          🔄 Refresh
        </button>
      </div>

      {/* Results Summary */}
      {!loading && (
        <div className="results-summary">
          Found <strong>{detections.length}</strong> detection(s)
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading detections...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="error-state">
          <p>❌ Error: {error}</p>
          <button onClick={fetchDetections}>Try Again</button>
        </div>
      )}

      {/* Detections Grid */}
      {!loading && !error && (
        <div className="detections-grid">
          {detections.length === 0 ? (
            <div className="empty-state">
              <p>No detections found matching your filters</p>
            </div>
          ) : (
            detections.map((detection) => (
              <div 
                key={detection.id} 
                className={`detection-card ${detection.is_hana ? 'is-hana' : 'not-hana'}`}
                onClick={() => setSelectedVideo(detection)}
              >
                <div className="card-header">
                  <span className="detection-id">#{detection.id}</span>
                  <span className={`hana-badge ${detection.is_hana ? 'yes' : 'no'}`}>
                    {detection.is_hana ? '🐱 Hana' : '❓ Unknown'}
                  </span>
                </div>

                <div className="video-thumbnail">
                  <video 
                    src={getVideoUrl(detection.photo_path)} 
                    muted
                    onMouseEnter={(e) => e.currentTarget.play()}
                    onMouseLeave={(e) => {
                      e.currentTarget.pause();
                      e.currentTarget.currentTime = 0;
                    }}
                  />
                  <div className="play-overlay">▶</div>
                </div>

                <div className="card-info">
                  <div className="info-row">
                    <span className="label">Confidence:</span>
                    <span className="value">{(detection.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Sensor:</span>
                    <span className="value">{getSensorLabel(detection.location)}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Time:</span>
                    <span className="value timestamp">{formatTimestamp(detection.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Video Player Modal */}
      {selectedVideo && (
        <div className="video-modal" onClick={() => setSelectedVideo(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedVideo(null)}>×</button>
            
            <div className="modal-header">
              <h2>Detection #{selectedVideo.id}</h2>
              <span className={`hana-badge ${selectedVideo.is_hana ? 'yes' : 'no'}`}>
                {selectedVideo.is_hana ? '🐱 Hana' : '❓ Unknown'}
              </span>
            </div>

            <video 
              src={getVideoUrl(selectedVideo.photo_path)} 
              controls 
              autoPlay
              className="modal-video"
            />

            <div className="modal-info">
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Confidence:</span>
                  <span className="value">{(selectedVideo.confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="info-item">
                  <span className="label">Sensor:</span>
                  <span className="value">{getSensorLabel(selectedVideo.location)}</span>
                </div>
                <div className="info-item">
                  <span className="label">Timestamp:</span>
                  <span className="value">{formatTimestamp(selectedVideo.timestamp)}</span>
                </div>
                <div className="info-item">
                  <span className="label">File:</span>
                  <span className="value filename">{selectedVideo.photo_path.split('/').pop()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
