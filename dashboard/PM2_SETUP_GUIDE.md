# Auto-Running Node.js Server with PM2
# 使用PM2自动运行Node.js服务器

## What is PM2? / 什么是PM2？

**English**: PM2 is a production process manager for Node.js applications. It keeps your server running 24/7, automatically restarts it if it crashes, and starts it when the Pi boots up.

**中文**: PM2是Node.js应用程序的生产进程管理器。它让你的服务器24/7运行，如果崩溃会自动重启，并在树莓派启动时启动它。

---

## Installation and Setup / 安装和设置

### Step 1: Install PM2 on Raspberry Pi
### 步骤1：在树莓派上安装PM2

```bash
# Connect to Pi
ssh tian@10.101.40.181

# Install PM2 globally
sudo npm install -g pm2
```

### Step 2: Start Your Server with PM2
### 步骤2：使用PM2启动你的服务器

```bash
# Navigate to your server directory
cd ~/pi-dashboard-server

# Start server with PM2
pm2 start server.js --name pi-dashboard-backend

# Alternative: Start with specific Node.js version
pm2 start server.js --name pi-dashboard-backend --interpreter node
```

**Output / 输出**:
```
┌─────┬──────────────────────────┬─────────┬─────────┬──────────┐
│ id  │ name                     │ status  │ restart │ uptime   │
├─────┼──────────────────────────┼─────────┼─────────┼──────────┤
│ 0   │ pi-dashboard-backend     │ online  │ 0       │ 0s       │
└─────┴──────────────────────────┴─────────┴─────────┴──────────┘
```

### Step 3: Save PM2 Process List
### 步骤3：保存PM2进程列表

```bash
# Save current running processes
pm2 save
```

This creates a "snapshot" of your running processes so PM2 remembers them after reboot.

这会创建你运行进程的"快照"，这样PM2在重启后会记住它们。

### Step 4: Enable Auto-Start on Boot
### 步骤4：启用开机自动启动

```bash
# Generate and configure startup script
pm2 startup

# You'll see output like:
# [PM2] You have to run this command as root. Execute the following command:
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u tian --hp /home/tian

# Copy and run the command shown (it will be similar to above)
```

**Example / 示例**:
```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u tian --hp /home/tian
```

### Step 5: Verify Everything Works
### 步骤5：验证一切正常

```bash
# Check PM2 status
pm2 status

# Reboot Pi to test auto-start
sudo reboot

# After Pi restarts, SSH back in and check
ssh tian@10.101.40.181
pm2 status
```

Your server should be running automatically!

你的服务器应该自动运行了！

---

## PM2 Management Commands / PM2管理命令

### Viewing Status / 查看状态

```bash
# List all processes
pm2 list

# Detailed info about your app
pm2 info pi-dashboard-backend

# Monitor in real-time
pm2 monit
```

### Managing Processes / 管理进程

```bash
# Stop server
pm2 stop pi-dashboard-backend

# Start server
pm2 start pi-dashboard-backend

# Restart server (useful after code changes)
pm2 restart pi-dashboard-backend

# Delete from PM2 (removes from list)
pm2 delete pi-dashboard-backend
```

### Viewing Logs / 查看日志

```bash
# View live logs (all processes)
pm2 logs

# View logs for specific app
pm2 logs pi-dashboard-backend

# View last 50 lines
pm2 logs pi-dashboard-backend --lines 50

# Clear logs
pm2 flush
```

### Save Changes / 保存更改

```bash
# After making any changes (start/stop/delete), save
pm2 save
```

---

## Updating Your Server Code / 更新你的服务器代码

When you make changes to `server.js`:

当你对 `server.js` 做更改时：

```bash
# 1. Copy new code to Pi
scp server.js tian@10.101.40.181:~/pi-dashboard-server/

# 2. SSH to Pi and restart
ssh tian@10.101.40.181
cd ~/pi-dashboard-server
pm2 restart pi-dashboard-backend

# That's it! New code is running
```

---

## Automated Deployment Script (Optional)
## 自动化部署脚本（可选）

Create `deploy-server.ps1` on your PC:

在你的电脑上创建 `deploy-server.ps1`：

```powershell
# deploy-server.ps1

$PI_USER = "tian"
$PI_HOST = "10.101.40.181"
$SERVER_DIR = "~/pi-dashboard-server"

Write-Host "📦 Deploying server to Pi..." -ForegroundColor Cyan

# Copy server files
scp server.js package.json ${PI_USER}@${PI_HOST}:${SERVER_DIR}/

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}

Write-Host "🔄 Restarting server..." -ForegroundColor Cyan

# Restart PM2 process
ssh ${PI_USER}@${PI_HOST} "cd ${SERVER_DIR} && pm2 restart pi-dashboard-backend"

Write-Host "✅ Server deployed and restarted!" -ForegroundColor Green
Write-Host "📊 Check status: ssh ${PI_USER}@${PI_HOST} 'pm2 status'" -ForegroundColor Cyan
```

**Usage / 使用方法**:
```powershell
.\deploy-server.ps1
```

---

## Troubleshooting / 故障排除

### Problem 1: Server Not Starting
### 问题1：服务器无法启动

```bash
# Check error logs
pm2 logs pi-dashboard-backend --err

# Try starting manually to see error
cd ~/pi-dashboard-server
node server.js
```

Common issues:
- Missing dependencies: `npm install`
- Port already in use: `sudo lsof -i :5000`
- Syntax error in code: Check logs

### Problem 2: Server Keeps Restarting
### 问题2：服务器持续重启

```bash
# Check how many times it restarted
pm2 status

# View error logs
pm2 logs pi-dashboard-backend --err --lines 100
```

If restarts > 10, there's probably a crash on startup.

如果重启次数 > 10，可能在启动时就崩溃了。

### Problem 3: PM2 Not Starting on Boot
### 问题3：PM2开机时不启动

```bash
# Re-run startup command
pm2 startup

# Copy and run the command it shows
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u tian --hp /home/tian

# Save processes again
pm2 save

# Test by rebooting
sudo reboot
```

### Problem 4: Check if Auto-Start is Configured
### 问题4：检查是否配置了自动启动

```bash
# Check systemd service
sudo systemctl status pm2-tian

# Should show "active (running)"
```

---

## Understanding PM2 Features / 理解PM2功能

### Auto-Restart on Crash / 崩溃时自动重启

If your Node.js server crashes, PM2 automatically restarts it:

如果你的Node.js服务器崩溃，PM2会自动重启它：

```
Server crashes → PM2 detects → Restarts server → Back online
服务器崩溃 → PM2检测到 → 重启服务器 → 重新在线
```

### Persistent Across Reboots / 重启后持久运行

With `pm2 startup` and `pm2 save`:

使用 `pm2 startup` 和 `pm2 save`：

```
Pi boots up → systemd starts PM2 → PM2 starts your server
树莓派启动 → systemd启动PM2 → PM2启动你的服务器
```

### Process Monitoring / 进程监控

```bash
pm2 monit
```

Shows real-time:
- CPU usage
- Memory usage
- Number of restarts
- Uptime

---

## PM2 vs Manual Node.js / PM2 vs 手动Node.js

| Feature 功能 | Manual `node server.js` | PM2 |
|-------------|-------------------------|-----|
| **Runs after terminal closes**<br>终端关闭后继续运行 | ❌ Stops | ✅ Keeps running |
| **Auto-restart on crash**<br>崩溃时自动重启 | ❌ No | ✅ Yes |
| **Auto-start on boot**<br>开机自动启动 | ❌ No | ✅ Yes |
| **Log management**<br>日志管理 | ❌ Manual | ✅ Automatic |
| **Monitoring**<br>监控 | ❌ No | ✅ Built-in |
| **Zero-downtime updates**<br>零停机更新 | ❌ No | ✅ With reload |

---

## Advanced PM2 Features / PM2高级功能

### Watch Mode (Auto-Restart on File Changes)
### 监视模式（文件更改时自动重启）

```bash
# Useful during development
pm2 start server.js --name pi-dashboard-backend --watch

# Stop watching
pm2 stop pi-dashboard-backend
pm2 start pi-dashboard-backend --no-watch
```

### Cluster Mode (Multiple Instances)
### 集群模式（多个实例）

```bash
# Run multiple instances for load balancing
pm2 start server.js -i 2  # 2 instances

# Or use max CPU cores
pm2 start server.js -i max
```

Note: Socket.io requires special configuration for cluster mode.

注意：Socket.io需要特殊配置才能使用集群模式。

### Environment Variables / 环境变量

```bash
# Set environment variables
pm2 start server.js --name pi-dashboard-backend --env production

# Or create ecosystem.config.js
```

### Ecosystem File (Advanced Configuration)
### 生态系统文件（高级配置）

Create `ecosystem.config.js` in your server directory:

在你的服务器目录中创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'pi-dashboard-backend',
    script: './server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '200M',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

Then start with:
```bash
pm2 start ecosystem.config.js
```

---

## Quick Setup Script / 快速设置脚本

Save this as `setup-pm2.sh` on your Pi:

在你的树莓派上保存为 `setup-pm2.sh`：

```bash
#!/bin/bash

echo "Installing PM2..."
sudo npm install -g pm2

echo "Starting server with PM2..."
cd ~/pi-dashboard-server
pm2 start server.js --name pi-dashboard-backend

echo "Saving PM2 process list..."
pm2 save

echo "Setting up auto-start..."
pm2 startup

echo ""
echo "✅ Setup complete!"
echo ""
echo "⚠️  IMPORTANT: Copy and run the command shown above (starts with 'sudo env')"
echo ""
echo "After running that command, run: pm2 save"
echo ""
echo "Useful commands:"
echo "  pm2 status              - Check server status"
echo "  pm2 logs                - View logs"
echo "  pm2 restart <name>      - Restart server"
echo "  pm2 monit               - Monitor in real-time"
```

Run it:
```bash
chmod +x setup-pm2.sh
./setup-pm2.sh
```

---

## Summary / 总结

**What PM2 does / PM2的作用:**
1. ✅ Keeps server running 24/7
2. ✅ Auto-restarts on crash
3. ✅ Starts automatically on Pi boot
4. ✅ Provides logs and monitoring
5. ✅ Easy updates with `pm2 restart`

**Essential commands / 基本命令:**
```bash
pm2 start server.js --name pi-dashboard-backend  # First time
pm2 save                                          # Save process list
pm2 startup                                       # Enable boot start
pm2 status                                        # Check status
pm2 logs                                          # View logs
pm2 restart pi-dashboard-backend                 # After code changes
```

**Your server is now production-ready! / 你的服务器现在已经准备好用于生产了！** 🚀

---

**Last Updated**: January 6, 2026
