const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { data, error } = await supabase
            .from('articles')
            .select('*')
            .order('seen_at', { ascending: false });

        if (error) throw error;
        res.json({ articles: data || [] });
    } catch (error) {
        console.error('Get articles error:', error);
        res.status(500).json({ error: error.message });
    }
};
