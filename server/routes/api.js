const express = require('express');
const router = express.Router();
const { getSystemStats } = require('../services/systemStats');

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

module.exports = router;
