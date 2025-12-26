const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ error: 'URL required' });
    }

    try {
        const { error } = await supabase
            .from('articles')
            .upsert({
                url,
                seen: true,
                seen_at: new Date().toISOString()
            }, {
                onConflict: 'url'
            });

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        console.error('Mark seen error:', error);
        res.status(500).json({ error: error.message });
    }
};
