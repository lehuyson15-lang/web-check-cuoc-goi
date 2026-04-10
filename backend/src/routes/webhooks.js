const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { processSTT } = require('../services/sttProcessor');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { apiLimiter } = require('../services/securityMiddleware');

const prisma = new PrismaClient();

// Webhook for Stringee (or other providers)
router.post('/stringee', apiLimiter, async (req, res) => {
  try {
    // Basic signature check
    const signature = req.headers['x-stringee-signature'];
    if (process.env.NODE_ENV === 'production' && !signature) {
      console.warn('Blocked webhook missing signature');
      return res.status(401).json({ message: 'Missing signature' });
    }

    const { event, call_id, recording_url, from, to, duration, state } = req.body;

    if (event === 'call.ended' && recording_url) {
      // 1. Map extension to user
      const user = await prisma.user.findFirst({
        where: { extensionVoip: to } // Example mapping
      });

      if (!user) {
        console.error('Call received for unknown extension:', to);
        return res.sendStatus(200);
      }

      // 2. Download recording file
      const fileName = `voip_${call_id}.mp3`;
      const filePath = path.join(__dirname, '../../uploads', fileName);
      
      const response = await axios({
        url: recording_url,
        method: 'GET',
        responseType: 'stream'
      });

      const writer = fs.createWriteStream(filePath);
      response.data.pipe(writer);

      writer.on('finish', async () => {
        // 3. Create call record
        const call = await prisma.call.create({
          data: {
            userId: user.id,
            customerPhone: from,
            direction: 'INBOUND',
            source: 'VOIP',
            durationSeconds: parseInt(duration) || 0,
            calledAt: new Date(),
            audioUrl: `uploads/${fileName}`,
            transcriptStatus: 'PENDING'
          }
        });

        // 4. Trigger STT processing
        processSTT(call.id, path.resolve(filePath));
      });
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
