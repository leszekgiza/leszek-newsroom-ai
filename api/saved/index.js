const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

module.exports = async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            const { data, error } = await supabase
                .from('saved')
                .select('*')
                .order('saved_at', { ascending: false });

            if (error) throw error;
            res.json({ saved: data || [] });
        } catch (error) {
            console.error('Get saved error:', error);
            res.status(500).json({ error: error.message });
        }
    } else if (req.method === 'POST') {
        const { url, title, description } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL required' });
        }

        try {
            const { error } = await supabase
                .from('saved')
                .upsert({
                    url,
                    title: title || '',
                    description: description || '',
                    saved_at: new Date().toISOString()
                }, {
                    onConflict: 'url',
                    ignoreDuplicates: true
                });

            if (error) throw error;
            res.json({ success: true });
        } catch (error) {
            console.error('Save article error:', error);
            res.status(500).json({ error: error.message });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
};
