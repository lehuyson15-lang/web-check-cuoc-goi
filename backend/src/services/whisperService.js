const fs = require('fs');
const { OpenAI } = require('openai');

// Initialize OpenAI client (Original)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Groq client (using OpenAI-compatible SDK)
const groq = process.env.GROQ_API_KEY ? new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
}) : null;

/**
 * Transcribe audio using Whisper (OpenAI or Groq)
 */
const transcribeAudio = async (filePath) => {
  try {
    const client = groq || openai;
    const model = groq ? "whisper-large-v3-turbo" : "whisper-1";

    console.log(`[Whisper] Transcribing with ${groq ? 'Groq' : 'OpenAI'} (${model})...`);

    const response = await client.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: model,
      language: "vi",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    return response;
  } catch (error) {
    console.error('[Whisper] STT Error:', error);
    throw error;
  }
};

module.exports = { transcribeAudio };
