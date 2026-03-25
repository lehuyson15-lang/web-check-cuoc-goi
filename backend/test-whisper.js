require('dotenv').config();
const { transcribeAudio } = require('./src/services/whisperService');
const path = require('path');
const fs = require('fs');

async function test() {
  const testFile = path.resolve('test-audio.mp3');
  // Copy to a filename without extension to simulate old multer
  const noExtFile = path.resolve('test-audio-no-ext');
  fs.copyFileSync(testFile, noExtFile);

  try {
    console.log('Testing with extension...');
    const res1 = await transcribeAudio(testFile);
    console.log('Success with extension!');

    console.log('Testing without extension...');
    const res2 = await transcribeAudio(noExtFile);
    console.log('Success without extension!');
  } catch (err) {
    console.error('Failed:', err.message);
  } finally {
    if (fs.existsSync(noExtFile)) fs.unlinkSync(noExtFile);
  }
}

test();
