const si = require('systeminformation');

/**
 * Get current system statistics
 * @returns {Promise<Object>} System stats including CPU, memory, temperature, network
 */
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

    // Find the first non-internal network interface, prefer local network (192.168.x.x) over VPN
    let ip = 'Unknown';
    if (Array.isArray(network)) {
      // First try to find local network IP (192.168.x.x or 10.x.x.x)
      const localIface = network.find(iface => 
        !iface.internal && iface.ip4 && 
        (iface.ip4.startsWith('192.168.') || iface.ip4.startsWith('10.'))
      );
      
      if (localIface) {
        ip = localIface.ip4;
      } else {
        // Fall back to any non-internal interface
        ip = network.find(iface => !iface.internal && iface.ip4)?.ip4 || 'Unknown';
      }
    }

    return {
      load: cpuLoad.currentLoad.toFixed(1), // CPU Load %
      temperature: cpuTemp.main !== null ? cpuTemp.main.toFixed(1) : 'N/A', // CPU Temp in C (null on Windows)
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

module.exports = { getSystemStats };
