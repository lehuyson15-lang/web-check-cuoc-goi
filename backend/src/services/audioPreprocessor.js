const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const { execSync } = require('child_process');

// Check if ffmpeg is available
const isFFmpegAvailable = () => {
  try {
    execSync('which ffmpeg 2>/dev/null || where ffmpeg 2>/dev/null', { stdio: 'pipe' });
    return true;
  } catch {
    // Also check common Homebrew path
    try {
      execSync('/opt/homebrew/bin/ffmpeg -version', { stdio: 'pipe' });
      ffmpeg.setFfmpegPath('/opt/homebrew/bin/ffmpeg');
      return true;
    } catch {
      return false;
    }
  }
};

const preprocessAudio = (inputPath) => {
  return new Promise((resolve, reject) => {
    if (!isFFmpegAvailable()) {
      console.warn('[AudioPreprocessor] ffmpeg not found, sending original file to Whisper');
      return resolve(inputPath); // Whisper can handle mp3/wav/m4a directly
    }

    const outputPath = inputPath.replace(path.extname(inputPath), '_processed.wav');
    
    ffmpeg(inputPath)
      .toFormat('wav')
      .audioChannels(1)
      .audioFrequency(16000)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => {
        console.warn('[AudioPreprocessor] ffmpeg error, using original file:', err.message);
        resolve(inputPath); // Fallback to original file
      })
      .save(outputPath);
  });
};

module.exports = { preprocessAudio };
