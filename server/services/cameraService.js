const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const path = require('path');
const fs = require('fs').promises;

// Camera lock to prevent simultaneous recordings
let isCameraInUse = false;
let currentRecordingPath = null;

/**
 * Capture 5-second video clip using Pi Camera
 * Includes locking mechanism to prevent conflicts
 * 
 * @returns {Promise<string>} Path to captured video / 
 * 
 */
async function capturePhoto() {
  // Check if camera is already recording
  if (isCameraInUse) {
    console.log('⏳ Camera busy! Returning current recording:', currentRecordingPath);
    // Return the current recording path instead of starting a new one
    return currentRecordingPath;
  }
  
  // Lock the camera
  isCameraInUse = true;
  // Format timestamp in local timezone (Denmark = UTC+1)
  const now = new Date();
  const timestamp = new Date(now.getTime() - (now.getTimezoneOffset() * 60000))
    .toISOString()
    .replace(/[:.]/g, '-');
  
  // Changed from .jpg to .mp4 for browser-compatible video
  const filename = `cat_${timestamp}.mp4`;
  const videoDir = '/home/tian/cat_videos';
  const videoPath = path.join(videoDir, filename);
  
  // Store current recording path
  currentRecordingPath = videoPath;
  
  console.log('🎥 Recording 5-second video clip...');
  
  try {
    // Ensure directory exists
    await fs.mkdir(videoDir, { recursive: true });
    
    // rpicam-vid: Raspberry Pi's video capture command
    //
    // -o ${videoPath}        : Output file path / 输出文件路径
    // --width 1280           : 720p width / 720p 宽度
    // --height 720           : 720p height / 720p 高度
    // -t 5000                : Duration 5000ms = 5 seconds / 持续时间 5000毫秒 = 5秒
    // --framerate 15         : 15 frames per second (storage-friendly) / 每秒15帧（节省存储）
    // --codec h264           : H.264 compression (hardware-accelerated) / H.264 编码（硬件加速）
    // --nopreview            : Don't show preview window / 不显示预览窗口
    // --save-pts timestamps.txt : Save frame timestamps for MP4 container
    let captureCommand = `rpicam-vid -o ${videoPath} --width 1280 --height 720 -t 5000 --framerate 15 --codec h264 --save-pts timestamps.txt --nopreview`;
    
    try {
      const { stdout, stderr } = await execPromise(captureCommand);
      // If there are any error messages, log them as warnings
      if (stderr) console.warn('Camera stderr:', stderr);
    } catch (err) {
      // Try old command name (libcamera-vid) if rpicam-vid doesn't exist
      
      console.log('rpicam-vid not found, trying libcamera-vid...');
      captureCommand = `libcamera-vid -o ${videoPath} --width 1280 --height 720 -t 5000 --framerate 15 --codec h264 --save-pts timestamps.txt --nopreview`;
      const { stdout, stderr } = await execPromise(captureCommand);
      if (stderr) console.warn('Camera stderr:', stderr);
    }
    
    console.log('✅ Video recorded:', videoPath);
    
    // Convert H.264 to proper MP4 container for browser compatibility
    console.log('🔄 Starting MP4 conversion...');
    const tempH264 = videoPath.replace('.mp4', '.h264');
    
    try {
      // Rename to .h264 temporarily
      console.log(`📝 Renaming ${videoPath} to ${tempH264}`);
      await fs.rename(videoPath, tempH264);
      
      // Convert to MP4 container using ffmpeg
      const convertCmd = `ffmpeg -i "${tempH264}" -c copy "${videoPath}" -y 2>&1`;
      console.log(`🎬 Running: ${convertCmd}`);
      const { stdout, stderr } = await execPromise(convertCmd);
      
      if (stderr && stderr.includes('error')) {
        throw new Error(stderr);
      }
      
      console.log('✅ Converted to MP4 container');
      
      // Delete temp h264 file
      await fs.unlink(tempH264);
      console.log('🗑️ Deleted temp H.264 file');
    } catch (convErr) {
      console.error('❌ MP4 conversion failed:', convErr.message);
      console.error('Full error:', convErr);
      // Restore original file if conversion fails
      try {
        await fs.rename(tempH264, videoPath);
        console.warn('⚠️ Restored original H.264 file');
      } catch (restoreErr) {
        console.error('❌ Failed to restore file:', restoreErr.message);
      }
    }
    
    // Release the camera lock
    isCameraInUse = false;
    currentRecordingPath = null;
    
    return videoPath;
  } catch (error) {
    console.error('❌ Camera capture failed:', error);
    
    // Release lock on error too
    isCameraInUse = false;
    currentRecordingPath = null;
    
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
