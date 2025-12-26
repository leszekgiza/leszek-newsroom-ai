const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

module.exports = async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            const { data, error } = await supabase
                .from('fetch_log')
                .select('*')
                .order('fetched_at', { ascending: false });

            if (error) throw error;
            res.json({ log: data || [] });
        } catch (error) {
            console.error('Get fetch log error:', error);
            res.status(500).json({ error: error.message });
        }
    } else if (req.method === 'POST') {
        const { source, articlesCount } = req.body;

        try {
            const { error } = await supabase
                .from('fetch_log')
                .insert({
                    source: source || 'unknown',
                    articles_count: articlesCount || 0,
                    fetched_at: new Date().toISOString()
                });

            if (error) throw error;
            res.json({ success: true });
        } catch (error) {
            console.error('Log fetch error:', error);
            res.status(500).json({ error: error.message });
        }
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
};
