const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

// Import modular components
const webhookRouter = require('./routes/webhook');
const apiRouter = require('./routes/api');
const { initializeStatsSocket } = require('./websocket/statsSocket');
const { initializeMQTT } = require('./services/mqttService');
const { initializeDatabase } = require('./services/databaseService');

// Setup Express app
const app = express();
app.use(cors()); // Allow connections from other devices
app.use(express.json()); // Parse JSON request bodies

// Serve cat photos
app.use('/cat-photos', express.static('/home/tian/cat_photos'));
// Serve cat videos
app.use('/cat-videos', express.static('/home/tian/cat_videos'));

const server = http.createServer(app);

// Setup Socket.io (WebSocket) with keepalive settings
const io = new Server(server, {
  cors: {
    origin: "*", // Allow any origin (React app) to connect
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,    // Wait 60s for pong before considering connection dead
  pingInterval: 25000,   // Send ping every 25s to keep connection alive
  connectTimeout: 45000  // Max time to wait for initial connection
});

const PORT = process.env.PORT || 5000;

// Register routes
app.use('/api', webhookRouter); // GitHub webhook at /api/webhook
app.use('/api', apiRouter);     // Health check, stats API

// Initialize WebSocket for real-time stats
initializeStatsSocket(io);

// Initialize Database
initializeDatabase().then(() => {
  console.log('✅ Database ready');
}).catch(err => {
  console.error('❌ Database initialization failed:', err);
});

// Initialize MQTT (cat detection)
initializeMQTT(io);

// Start the server
server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Server running on port', PORT);
  console.log('📡 WebSocket endpoint: ws://localhost:' + PORT);
  console.log('🌐 Access from network: ws://<your-pi-ip>:' + PORT);
  console.log('🔗 Webhook endpoint: http://localhost:' + PORT + '/api/webhook');
});
