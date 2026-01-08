const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

// Import modular components
const webhookRouter = require('./routes/webhook');
const apiRouter = require('./routes/api');
const { initializeStatsSocket } = require('./websocket/statsSocket');

// Setup Express app
const app = express();
app.use(cors()); // Allow connections from other devices
app.use(express.json()); // Parse JSON request bodies

const server = http.createServer(app);

// Setup Socket.io (WebSocket)
const io = new Server(server, {
  cors: {
    origin: "*", // Allow any origin (React app) to connect
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// Register routes
app.use('/api', webhookRouter); // GitHub webhook at /api/webhook
app.use('/api', apiRouter);     // Health check, stats API

// Initialize WebSocket for real-time stats
initializeStatsSocket(io);

// Start the server
server.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Server running on port', PORT);
  console.log('📡 WebSocket endpoint: ws://localhost:' + PORT);
  console.log('🌐 Access from network: ws://<your-pi-ip>:' + PORT);
  console.log('🔗 Webhook endpoint: http://localhost:' + PORT + '/api/webhook');
});
