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

module.exports = { getSystemStats };
