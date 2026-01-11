const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const path = require('path');
const fs = require('fs').promises;

/**
 * Capture photo using Pi Camera
 * @returns {Promise<string>} Path to captured photo
 */
async function capturePhoto() {
  // Format timestamp in local timezone (Denmark = UTC+1)
  const now = new Date();
  const timestamp = new Date(now.getTime() - (now.getTimezoneOffset() * 60000))
    .toISOString()
    .replace(/[:.]/g, '-');
  const filename = `cat_${timestamp}.jpg`;
  const photoDir = '/home/tian/cat_photos';
  const photoPath = path.join(photoDir, filename);
  
  console.log('📸 Capturing photo with Pi Camera...');
  
  try {
    // Ensure directory exists
    await fs.mkdir(photoDir, { recursive: true });
    
    // Try rpicam-still first (Ubuntu 25.10+), fallback to libcamera-still (older)
    let captureCommand = `rpicam-still -o ${photoPath} --width 1920 --height 1080 --timeout 1000 --nopreview`;
    
    try {
      const { stdout, stderr } = await execPromise(captureCommand);
      if (stderr) console.warn('Camera stderr:', stderr);
    } catch (err) {
      // Try old command name
      console.log('rpicam-still not found, trying libcamera-still...');
      captureCommand = `libcamera-still -o ${photoPath} --width 1920 --height 1080 --timeout 1000 --nopreview`;
      const { stdout, stderr } = await execPromise(captureCommand);
      if (stderr) console.warn('Camera stderr:', stderr);
    }
    
    console.log('✅ Photo captured:', photoPath);
    return photoPath;
  } catch (error) {
    console.error('❌ Camera capture failed:', error);
    throw error;
  }
}

/**
 * Test if camera is working
 * @returns {Promise<boolean>}
 */
async function testCamera() {
  try {
    // Try rpicam-hello first (Ubuntu 25.10+)
    let { stdout } = await execPromise('rpicam-hello --list-cameras 2>&1 || libcamera-hello --list-cameras 2>&1');
    console.log('📷 Camera detected:', stdout);
    return stdout.includes('Available cameras') || stdout.includes('camera');
  } catch (error) {
    console.error('❌ No camera detected');
    return false;
  }
}

module.exports = { capturePhoto, testCamera };
