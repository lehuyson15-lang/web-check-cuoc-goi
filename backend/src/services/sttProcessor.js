const { PrismaClient } = require('@prisma/client');
const { preprocessAudio } = require('../services/audioPreprocessor');
const { transcribeAudio } = require('../services/whisperService');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

/**
 * Process STT directly (Local Mode - No Redis)
 */
const processSTT = async (callId, filePath) => {
  try {
    console.log(`[STT] Starting processing for call: ${callId}`);
    
    // Update status to processing
    await prisma.call.update({
      where: { id: callId },
      data: { transcriptStatus: 'PROCESSING' }
    });

    // 1. Preprocess audio
    const processedPath = await preprocessAudio(filePath);

    // 2. Transcribe with Whisper
    const transcriptData = await transcribeAudio(processedPath);

    // 3. Save segments to DB
    const segments = transcriptData.segments.map(seg => ({
      callId,
      speaker: 'unknown',
      startTime: seg.start,
      endTime: seg.end,
      text: seg.text.trim(),
    }));

    await prisma.transcriptSegment.createMany({
      data: segments
    });

    // 4. Update call status
    await prisma.call.update({
      where: { id: callId },
      data: { 
        transcriptStatus: 'DONE',
        durationSeconds: Math.round(transcriptData.duration || 0)
      }
    });

    console.log(`[STT] Successfully processed call: ${callId}`);

    // Clean up files
    if (fs.existsSync(processedPath) && processedPath !== filePath) {
      fs.unlinkSync(processedPath);
    }

    return { status: 'success' };
  } catch (error) {
    console.error(`[STT] Error processing call ${callId}:`, error);
    
    let status = 'FAILED';
    if (error.message.includes('insufficient_quota') || error.status === 429) {
      console.error('[STT] OpenAI Quota Exceeded. Please check billing.');
      // You could add a specific status like 'QUOTA_EXCEEDED' if you update the Prisma schema
    }

    await prisma.call.update({
      where: { id: callId },
      data: { transcriptStatus: status }
    });
  }
};

module.exports = { processSTT };
