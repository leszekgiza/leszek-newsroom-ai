module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const polishVoices = [
        { id: 'pl-PL-ZofiaNeural', name: 'Zofia (kobieta)', gender: 'Female' },
        { id: 'pl-PL-MarekNeural', name: 'Marek (mezczyzna)', gender: 'Male' }
    ];

    res.json({ voices: polishVoices });
};
