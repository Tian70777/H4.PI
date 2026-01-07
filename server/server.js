const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const si = require('systeminformation');
const cors = require('cors');

// 1. Setup the Server
const app = express();
app.use(cors()); // Allow connections from other devices (like your PC)

const server = http.createServer(app);

// Setup Socket.io (WebSocket)
const io = new Server(server, {
  cors: {
    origin: "*", // Allow any origin (React app) to connect
    methods: ["GET", "POST"]
  }
});

const PORT = 5000;

// 2. Define what data we want to send
async function getSystemStats() {
  try {
    // Fetch all data in parallel for speed
    const [cpuLoad, cpuTemp, mem, time, network] = await Promise.all([
      si.currentLoad(),
      si.cpuTemperature(),
      si.mem(),
      si.time(),
      si.networkInterfaces()
    ]);

    // Find the first non-internal network interface (usually eth0 or wlan0)
    const ip = Array.isArray(network) 
      ? network.find(iface => !iface.internal && iface.ip4)?.ip4 
      : 'Unknown';

    return {
      load: cpuLoad.currentLoad.toFixed(1), // CPU Load %
      temperature: cpuTemp.main.toFixed(1), // CPU Temp in C
      memoryUsage: ((mem.active / mem.total) * 100).toFixed(1), // Memory Used %
      totalMemory: (mem.total / 1024 / 1024 / 1024).toFixed(2) + "GB", // Total GB
      ipAddress: ip || "Unknown",
      uptime: new Date(time.current).toLocaleString() // Current Server Time
    };
  } catch (error) {
    console.error("Error getting stats:", error);
    return null;
  }
}

// 3. Handle WebSocket Connections
io.on('connection', async (socket) => {
  console.log('Browser connected:', socket.id);

  // Send data immediately when browser connects
  const stats = await getSystemStats();
  if (stats) {
    socket.emit('stats', stats);
  }

  // Cleanup when browser disconnects
  socket.on('disconnect', () => {
    console.log('Browser disconnected:', socket.id);
  });
});

// 4. Broadcast stats every 2 seconds to all connected browsers
// Global timer
setInterval(async () => {
  const stats = await getSystemStats();
  if (stats) {
    io.emit('stats', stats);
    console.log('Broadcasted stats to all clients');
  }
}, 2000);

// 5. Start the Server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`Access from network: ws://<your-pi-ip>:${PORT}`);
});
