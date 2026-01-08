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

    // Respond to GitHub immediately (within 10 seconds)
    res.status(202).json({ 
      success: true, 
      message: 'Deployment started'
    });

    // Deploy in background (don't wait for GitHub)
    (async () => {
      try {
        // Pull latest code
        await pullCode();

        // Check if frontend files changed
        const frontendChanged = changedFiles.some(f => f.startsWith('dashboard/'));
        if (frontendChanged) {
          console.log('🎨 Frontend files changed, rebuilding...');
          await rebuildFrontend();
          console.log('✅ Frontend rebuild complete');
        }

        // Check if backend files changed
        const backendChanged = changedFiles.some(f => f.startsWith('server/'));
        if (backendChanged) {
          console.log('⚙️ Backend files changed, restarting...');
          await restartBackend();
          console.log('✅ Backend restart complete');
        }

        if (!frontendChanged && !backendChanged) {
          console.log('📄 Only documentation/config changed, no rebuild needed');
        }

        console.log('🎉 Deployment completed successfully!');
      } catch (error) {
        console.error('❌ Background deployment failed:', error);
      }
    })();

  } catch (error) {
    console.error('❌ Webhook failed:', error);
    // Response already sent, just log the error
  }
});

module.exports = router;
