const express = require('express');
const router = express.Router();
const { getSystemStats } = require('../services/systemStats');
const { getRecentDetections, getStatistics } = require('../services/databaseService');

/**
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

/**
 * Get current system stats (HTTP endpoint, alternative to WebSocket)
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getSystemStats();
    if (stats) {
      res.json(stats);
    } else {
      res.status(500).json({ error: 'Failed to get stats' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get detection history with optional filters
 * Query params:
 * - limit: Number of records (default: 50)
 * - startDate: Filter by start date (ISO format)
 * - endDate: Filter by end date (ISO format)
 * - isHana: Filter by Hana detections (true/false)
 * - sensor: Filter by sensor ('sensor1', 'sensor2', 'both')
 */
router.get('/detections', async (req, res) => {
  try {
    const { limit = 50, startDate, endDate, isHana, sensor } = req.query;
    
    // Get detections from database
    let detections = await getRecentDetections(parseInt(limit));
    
    // Apply filters
    if (startDate) {
      detections = detections.filter(d => new Date(d.timestamp) >= new Date(startDate));
    }
    
    if (endDate) {
      detections = detections.filter(d => new Date(d.timestamp) <= new Date(endDate));
    }
    
    if (isHana !== undefined) {
      const hanaFilter = isHana === 'true' || isHana === '1';
      detections = detections.filter(d => d.is_hana === (hanaFilter ? 1 : 0));
    }
    
    if (sensor) {
      detections = detections.filter(d => d.location === sensor);
    }
    
    res.json({
      count: detections.length,
      detections: detections
    });
  } catch (error) {
    console.error('❌ Failed to get detections:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get detection statistics
 * Query params:
 * - days: Number of days to include (default: 7)
 */
router.get('/statistics', async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const stats = await getStatistics(parseInt(days));
    res.json(stats);
  } catch (error) {
    console.error('❌ Failed to get statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
