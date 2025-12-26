const { EdgeTTS } = require('node-edge-tts');
const path = require('path');
const fs = require('fs');
const os = require('os');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { text, voice = 'pl-PL-ZofiaNeural' } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        // Create temp file path
        const tempDir = os.tmpdir();
        const tempFile = path.join(tempDir, `tts_${Date.now()}.mp3`);

        const tts = new EdgeTTS({
            voice: voice,
            lang: 'pl-PL',
            outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
        });

        await tts.ttsPromise(text, tempFile);

        // Read the file and send it
        const audioBuffer = fs.readFileSync(tempFile);

        // Clean up temp file
        fs.unlinkSync(tempFile);

        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', audioBuffer.length);
        res.send(audioBuffer);

    } catch (error) {
        console.error('TTS error:', error);
        res.status(500).json({ error: error.message });
    }
};
