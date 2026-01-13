const { getSystemStats } = require('../services/systemStats');

/**
 * Initialize WebSocket for real-time stats broadcasting
 * @param {Server} io - Socket.io server instance
 */
function initializeStatsSocket(io) {
  // Handle new client connections
  io.on('connection', async (socket) => {
    console.log('🌐 Browser connected:', socket.id);

    // Send data immediately when browser connects
    const stats = await getSystemStats();
    if (stats) {
      socket.emit('stats', stats);
    }

    // Cleanup when browser disconnects
    socket.on('disconnect', () => {
      console.log('👋 Browser disconnected:', socket.id);
    });
  });

  // Broadcast stats every 2 seconds to all connected browsers
  setInterval(async () => {
    const stats = await getSystemStats();
    if (stats) {
      io.emit('stats', stats);
      // console.log('📊 Broadcasted stats to all clients');  // Reduced logging spam
    }
  }, 2000);

  console.log('✅ Stats WebSocket initialized');
}

module.exports = { initializeStatsSocket };
