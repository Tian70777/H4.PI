const express = require('express');
const router = express.Router();
const { pullCode, rebuildFrontend, restartBackend } = require('../services/deployment');

/**
 * GitHub webhook endpoint
 * Receives push events and deploys changes automatically
 */
router.post('/webhook', async (req, res) => {
  try {
    console.log('🔔 Webhook received from GitHub');

    // Extract changed files from GitHub payload
    const commits = req.body.commits || [];
    const changedFiles = commits.length > 0 ? commits[0].modified || [] : [];
    
    console.log('📝 Changed files:', changedFiles);

    // Pull latest code
    await pullCode();

    // Check if frontend files changed
    const frontendChanged = changedFiles.some(f => f.startsWith('dashboard/'));
    if (frontendChanged) {
      console.log('🎨 Frontend files changed, rebuilding...');
      await rebuildFrontend();
    }

    // Check if backend files changed
    const backendChanged = changedFiles.some(f => f.startsWith('server/'));
    if (backendChanged) {
      console.log('⚙️ Backend files changed, restarting...');
      await restartBackend();
    }

    if (!frontendChanged && !backendChanged) {
      console.log('📄 Only documentation/config changed, no rebuild needed');
    }

    res.status(200).json({ 
      success: true, 
      message: 'Deployment completed',
      frontendRebuilt: frontendChanged,
      backendRestarted: backendChanged
    });

  } catch (error) {
    console.error('❌ Webhook deployment failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;
