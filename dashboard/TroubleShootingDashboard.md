# Raspberry Pi Dashboard - Troubleshooting Guide

This document chronicles the issues encountered while building and deploying the real-time Raspberry Pi monitoring dashboard, and how each was resolved.

## Project Overview

**Goal**: Create a web dashboard showing real-time Raspberry Pi system stats (CPU load, temperature, memory usage) using WebSocket technology.

**Stack**:
- Frontend: React + TypeScript + Vite (served by Nginx on port 80)
- Backend: Node.js + Express + Socket.io + systeminformation (running on port 5000)
- Deployment: PowerShell automation script with SCP

---

## Issue #1: File Permissions After Deployment

### Problem
After deploying the React build files to `/var/www/html/`, the browser showed 403 Forbidden errors for CSS and JS files in the `assets/` folder.

### Root Cause
When using `scp` to copy files, directories are created with restrictive permissions (700 by default). The `assets/` folder had permissions that prevented the Nginx web server (running as user `www-data`) from reading the files.

### Solution
Added automatic permission fixing to the deployment script:

```powershell
# In deploy.ps1
ssh tian@10.101.40.181 "chmod -R 755 /var/www/html"
```

This ensures all files and directories are readable by the web server after each deployment.

**Verification**: Check permissions on Pi with `ls -la /var/www/html/assets/`

---

## Issue #2: Hostname Resolution Problems

### Problem
Initially tried to connect to the Pi using `raspberrypi.local`, but this hostname didn't work.

### Root Cause
The Raspberry Pi was not named "raspberrypi" – it was actually configured with hostname `TianServer01`. 

### Discovery Process
1. Found the correct hostname using mDNS service discovery:
   ```bash
   avahi-browse -rt _workstation._tcp
   ```
2. Confirmed hostname in Pi's `/etc/hostname` file: `TianServer01`
3. Updated connection string to use `tianserver01.local`

### Additional Complication
While `tianserver01.local` worked from the Pi itself, Windows PCs on the network had unreliable mDNS resolution.

### Final Solution
Switched to using the Pi's IP address directly: `10.101.40.181`

```typescript
// In App.tsx
const SOCKET_URL = 'http://10.101.40.181:5000';
```

**Best Practice**: For production IoT deployments on local networks, use static IP addresses or configure proper DNS rather than relying on mDNS (.local domains).

---

## Issue #3: WebSocket Connection Timeout

### Problem
React dashboard loaded successfully (HTML, CSS, JS all working), but showed "Connecting to Pi..." indefinitely. Browser console showed:

```
Failed to load resource: net::ERR_CONNECTION_TIMED_OUT
socket.io connection timeout errors
```

### Troubleshooting Steps

1. **Verified Backend Running**
   ```bash
   ps aux | grep node
   # Output showed: node server.js (PID 26550)
   ```

2. **Confirmed Server Broadcasting**
   ```bash
   # Terminal output from server.js showed:
   Broadcasted stats to all clients
   Broadcasted stats to all clients
   # ... repeating every 2 seconds
   ```

3. **Checked Frontend Requests**
   - Browser Network tab showed Socket.io attempting connections
   - All requests to `http://10.101.40.181:5000/socket.io/...` timing out
   - No successful handshake established

4. **Tested Port Accessibility**
   ```powershell
   # From Windows PC:
   Test-NetConnection -ComputerName 10.101.40.181 -Port 5000
   # Result: TcpTestSucceeded = False
   ```

### Root Cause
The Pi's firewall (UFW - Uncomplicated Firewall) was blocking incoming connections to port 5000. By default, UFW blocks all incoming connections except those explicitly allowed.

### Solution
Open port 5000 in the firewall:

```bash
sudo ufw allow 5000
```

**Verification**: 
```powershell
Test-NetConnection -ComputerName 10.101.40.181 -Port 5000
# Result: TcpTestSucceeded = True
```

After fixing the firewall, refreshing the browser immediately established the WebSocket connection, and the dashboard started showing real-time data.

---

## Issue #4: Understanding the Architecture

### Initial Confusion
There was initial uncertainty about how to get "live data" from the Pi to the dashboard.

### Learning Process
1. **WebSocket vs HTTP Polling**: Learned that WebSocket provides bidirectional, real-time communication - perfect for IoT monitoring
2. **Server-Side Data Collection**: The backend uses the `systeminformation` library to read actual Pi hardware stats
3. **Broadcasting Pattern**: Using a global timer that broadcasts to all connected clients is more efficient than per-client timers
4. **Edge Computing**: The Pi acts as an "edge device" - processing data locally before sending to clients

### Final Architecture Understanding
```
┌─────────────────┐         ┌──────────────────┐
│  Web Browser    │         │  Raspberry Pi    │
│  (Client)       │◄────────┤  (Edge Gateway)  │
│                 │ WebSocket│                  │
│  React App      │         │  Node.js Server  │
│  port 80 (HTTP) │         │  port 5000 (WS)  │
└─────────────────┘         └──────────────────┘
                                     │
                            Reads system stats
                            (CPU, temp, memory)
```

---

## Deployment Automation

### Repeatable Deployment Process

Created `deploy.ps1` script that automates:
1. Building the React app (`npm run build`)
2. Copying files to Pi via SCP
3. Fixing file permissions
4. Providing deployment confirmation

### Current Limitation
Script requires password entry twice (once for SCP, once for SSH). 

### Future Enhancement
Set up SSH key authentication:
```powershell
# Generate SSH key (if not already done)
ssh-keygen -t ed25519

# Copy to Pi
ssh-copy-id tian@10.101.40.181
```

This enables passwordless deployment.

---

## Best Practices Learned

1. **File Permissions**: Always verify web server can read deployed files (`chmod 755` for directories, `644` for files)

2. **Network Reliability**: Use IP addresses instead of mDNS hostnames for IoT devices on mixed OS networks

3. **Firewall Configuration**: When exposing new services, always check firewall rules first if connections fail

4. **Debugging WebSockets**: 
   - Verify server is running (`ps aux`)
   - Check server logs (terminal output)
   - Use browser DevTools Network tab to see connection attempts
   - Test port accessibility from client machine (`Test-NetConnection` on Windows, `nc -zv` on Linux)

5. **IoT Architecture**: Edge devices should process data locally when possible, then send results to clients/cloud

---

## Production Recommendations

### Process Management
Use PM2 to keep the backend running 24/7:
```bash
sudo npm install -g pm2
pm2 start server.js --name pi-dashboard-backend
pm2 save
pm2 startup
```

### Security Enhancements
- Consider setting up reverse proxy (Nginx forwards `/socket.io` → port 5000)
- Add HTTPS with self-signed certificate for local network
- Implement basic authentication if dashboard is accessible outside local network

### Monitoring
- Set up PM2 monitoring: `pm2 monit`
- Configure server restart on crashes: `pm2 restart <id> --watch`

---

## Quick Reference Commands

### On Raspberry Pi
```bash
# Check if server is running
ps aux | grep node

# View server logs (if using PM2)
pm2 logs pi-dashboard-backend

# Check firewall status
sudo ufw status

# Open a port
sudo ufw allow <port>

# Restart Nginx
sudo systemctl restart nginx
```

### On Development PC
```bash
# Deploy changes
.\deploy.ps1

# Test port connectivity
Test-NetConnection -ComputerName 10.101.40.181 -Port 5000

# Connect via SSH
ssh tian@10.101.40.181
```

---

## Lessons for Future IoT Projects

1. **Start with network fundamentals**: Ensure firewall, DNS/hostname, and port accessibility are configured before debugging application code

2. **Test each layer independently**: 
   - Can you ping the device? 
   - Can you SSH to it? 
   - Can you access the web server (port 80)?
   - Can you connect to the WebSocket server (port 5000)?

3. **Use IP addresses during development**: They're more reliable than mDNS across different operating systems

4. **Automate deployment early**: Creates consistency and catches permission issues quickly

5. **Document as you go**: Network configurations, firewall rules, and architecture decisions are easy to forget

---

## Success Metrics

✅ Dashboard loads in browser  
✅ WebSocket connection established (green "Connected to Pi" indicator)  
✅ Real-time data updates every 2 seconds  
✅ Accurate CPU load, temperature, and memory readings  
✅ Automated deployment process  
✅ Responsive cyberpunk-themed UI  

---

**Last Updated**: January 6, 2026  
**Status**: Fully operational 🚀
