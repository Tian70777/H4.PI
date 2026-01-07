# Raspberry Pi Monitor Server

This is the backend server that runs on your Raspberry Pi. It reads system statistics (CPU, RAM, Temp) and sends them to the dashboard in real-time using WebSockets.

## How it Works
1.  **Express & HTTP**: Creates a basic web server.
2.  **Socket.io**: Creates a "live link" to any connected client (your dashboard).
3.  **SystemInformation**: A library that reads hardware info from the OS.
4.  **Interval**: Every 2 seconds, it reads the stats and "emits" them to all connected clients.

## Setup & Run

### 1. Install Dependencies
(If you haven't already)
```bash
npm install
```

### 2. Run the Server
```bash
node server.js
```

You should see:
```
Server running on port 5000
```

## Deployment to Pi
1.  Copy this entire `server` folder to your Raspberry Pi.
2.  Run `npm install` inside the folder on the Pi.
3.  Run `node server.js`.
4.  (Optional) Use `pm2` to keep it running in the background:
    *   `sudo npm install -g pm2`
    *   `pm2 start server.js --name pi-monitor`
    *   `pm2 save`
    *   `pm2 startup`
