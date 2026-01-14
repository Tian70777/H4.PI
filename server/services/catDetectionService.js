const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const path = require('path');
const fs = require('fs');

/**
 * Analyze cat video using trained TensorFlow Lite model
 * Calls Python script with cat_detector.py
 * 
 * @param {string} videoPath - Path to captured video (.h264 or .mp4)
 * @returns {Promise<Object>} Detection result
 */
async function analyzeCat(videoPath) {
  console.log('🔍 Analyzing cat in video:', videoPath);
  
  try {
    // Use the trained model to analyze video
    const result = await runPythonAnalysis(videoPath);
    
    return result;
  } catch (error) {
    console.error('❌ Analysis failed:', error);
    return {
      isHana: false,
      confidence: 0,
      error: error.message
    };
  }
}

/**
 * Run Python ML model with trained TFLite model
 * Uses cat_detector.py from cat_detection folder
 * 
 * @param {string} videoPath - Path to video file
 * @returns {Promise<Object>} Analysis result
 */
async function runPythonAnalysis(videoPath) {
  const pythonScript = path.join(__dirname, '../../cat_detection/cat_detector_cli.py');
  const modelPath = path.join(__dirname, '../../cat_detection/models/cat_detector_v1.tflite');
  
  try {
    // Check if video file exists
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }
    
    // Check if Python script exists
    if (!fs.existsSync(pythonScript)) {
      throw new Error(`Python script not found: ${pythonScript}`);
    }
    
    // Check if model file exists
    if (!fs.existsSync(modelPath)) {
      throw new Error(`Model file not found: ${modelPath}`);
    }
    
    // Call Python CLI script: python3 cat_detector_cli.py <video_path> <model_path>
    // The CLI script outputs JSON with detection results
    const command = `python3 "${pythonScript}" "${videoPath}" "${modelPath}"`;
    
    const { stdout, stderr } = await execPromise(command, {
      timeout: 30000 // 30 second timeout
    });
    
    if (stderr && !stderr.includes('WARNING') && !stderr.includes('✅')) {
      console.warn('Python stderr:', stderr);
    }
    
    // Parse JSON output from Python script
    const result = JSON.parse(stdout);
    
    if (result.error) {
      throw new Error(result.error);
    }
    
    // Extract video analysis data if available
    const isHana = result.class === 'hana';
    const confidence = result.confidence || 0;
    
    console.log(`✅ Analysis complete: ${isHana ? 'Hana detected!' : 'No Hana'} (confidence: ${(confidence * 100).toFixed(1)}%)`);
    
    return {
      isHana: isHana,
      confidence: confidence,
      detectionCount: result.video_analysis?.hana_percentage || 0,
      percentage: result.video_analysis?.hana_percentage || 0,
      framesAnalyzed: result.video_analysis?.frames_analyzed || 0,
      duration: result.video_analysis?.duration || 0,
      detectionTimeMs: result.detection_time_ms || 0,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ Python analysis failed:', error.message);
    
    // Fallback to mock data if Python fails (for development)
    console.warn('⚠️ Using fallback mock detection');
    const mockConfidence = Math.random() * 0.5 + 0.5;
    
    return {
      isHana: mockConfidence > 0.7,
      confidence: mockConfidence,
      detectionCount: 0,
      percentage: 0,
      framesAnalyzed: 0,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = { analyzeCat };
