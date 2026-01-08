const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * Pull latest code from GitHub
 * @returns {Promise<void>}
 */
async function pullCode() {
  console.log('📥 Pulling latest code from GitHub...');
  const { stdout, stderr } = await execPromise('cd /home/tian/H4.PI && git pull origin main');
  console.log('Git output:', stdout);
  if (stderr) console.error('Git stderr:', stderr);
  return { stdout, stderr };
}

/**
 * Rebuild frontend (npm build + copy to nginx)
 * @returns {Promise<void>}
 */
async function rebuildFrontend() {
  console.log('🔨 Rebuilding frontend...');
  const { stdout, stderr } = await execPromise(
    'cd /home/tian/H4.PI/dashboard && npm run build && cp -r dist/* /var/www/html/'
  );
  console.log('✅ Frontend rebuilt successfully');
  return { stdout, stderr };
}

/**
 * Restart backend server with PM2
 * @returns {Promise<void>}
 */
async function restartBackend() {
  console.log('🔄 Restarting backend server...');
  const { stdout, stderr } = await execPromise('pm2 restart server');
  console.log('✅ Backend restarted successfully');
  return { stdout, stderr };
}

module.exports = { pullCode, rebuildFrontend, restartBackend };
