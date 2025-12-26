const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

module.exports = async function handler(req, res) {
    if (req.method !== 'DELETE') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { url } = req.query;
    if (!url) {
        return res.status(400).json({ error: 'URL required' });
    }

    const decodedUrl = decodeURIComponent(url);

    try {
        const { error } = await supabase
            .from('saved')
            .delete()
            .eq('url', decodedUrl);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        console.error('Delete saved error:', error);
        res.status(500).json({ error: error.message });
    }
};
