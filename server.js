require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');
const { EdgeTTS } = require('node-edge-tts');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { Pool } = require('pg');
const Parser = require('rss-parser');

const rssParser = new Parser({
    timeout: 10000,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsroomBot/1.0)' }
});

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL client
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 5432,
});

// Data directory for TTS temp files
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Anthropic client
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

// Helper function to extract article content from HTML
async function fetchArticleContent(url) {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
        }
    });
    if (!response.ok) throw new Error(`Failed to fetch URL: ${response.status}`);
    const html = await response.text();
    const $ = cheerio.load(html);
    $('script, style, nav, footer, header, aside, .ads, .sidebar, .comments').remove();
    let content = '';
    const selectors = ['article', 'main', '.post-content', '.entry-content', '.content'];
    for (const selector of selectors) {
        const el = $(selector);
        if (el.length && el.text().trim().length > 500) {
            content = el.text().trim();
            break;
        }
    }
    if (!content) content = $('body').text().trim();
    return content.replace(/\s+/g, ' ').substring(0, 15000);
}

// API: Generate article summary
app.post('/api/summarize', async (req, res) => {
    try {
        const { url, title } = req.body;
        if (!url) return res.status(400).json({ error: 'URL is required' });
        if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });

        console.log(`Fetching article from: ${url}`);
        const articleContent = await fetchArticleContent(url);

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            messages: [{
                role: 'user',
                content: `Przeanalizuj artykul:\nTytul: ${title || 'Nieznany'}\nURL: ${url}\n\nTresc:\n${articleContent}\n\n---\nProsze o:\n1. **Streszczenie** (3-5 zdan)\n2. **Kluczowe insighty** (3-5 punktow)\n3. **Implikacje** (2-3 punkty)\n\nOdpowiedz po polsku w markdown.`
            }]
        });
        res.json({ summary: message.content[0].text });
    } catch (error) {
        console.error('Summarize error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: Text-to-Speech
app.post('/api/tts', async (req, res) => {
    try {
        const { text, voice = 'pl-PL-ZofiaNeural' } = req.body;
        if (!text) return res.status(400).json({ error: 'Text is required' });

        const tempFile = path.join(DATA_DIR, `tts_${Date.now()}.mp3`);
        const tts = new EdgeTTS({ voice, lang: 'pl-PL', outputFormat: 'audio-24khz-48kbitrate-mono-mp3' });
        await tts.ttsPromise(text, tempFile);

        const audioBuffer = fs.readFileSync(tempFile);
        fs.unlinkSync(tempFile);

        res.set({ 'Content-Type': 'audio/mpeg', 'Content-Length': audioBuffer.length });
        res.send(audioBuffer);
    } catch (error) {
        console.error('TTS error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: List TTS voices
app.get('/api/tts/voices', (req, res) => {
    res.json({ voices: [
        { id: 'pl-PL-ZofiaNeural', name: 'Zofia (kobieta)', gender: 'Female' },
        { id: 'pl-PL-MarekNeural', name: 'Marek (mezczyzna)', gender: 'Male' }
    ]});
});

// API: Get all articles
app.get('/api/articles', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM articles ORDER BY seen_at DESC NULLS LAST');
        res.json({ articles: rows });
    } catch (error) {
        console.error('Get articles error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: Mark article as seen
app.post('/api/articles/seen', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });
    try {
        await pool.query(
            `INSERT INTO articles (url, seen, seen_at) VALUES ($1, true, NOW())
             ON CONFLICT (url) DO UPDATE SET seen = true, seen_at = NOW()`,
            [url]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Mark seen error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: Save article
app.post('/api/saved', async (req, res) => {
    const { url, title, description } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });
    try {
        await pool.query(
            `INSERT INTO saved (url, title, description, saved_at) VALUES ($1, $2, $3, NOW())
             ON CONFLICT (url) DO NOTHING`,
            [url, title || '', description || '']
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Save article error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: Get saved articles
app.get('/api/saved', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM saved ORDER BY saved_at DESC');
        res.json({ saved: rows });
    } catch (error) {
        console.error('Get saved error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: Remove saved article
app.delete('/api/saved/:encodedUrl', async (req, res) => {
    const url = decodeURIComponent(req.params.encodedUrl);
    try {
        await pool.query('DELETE FROM saved WHERE url = $1', [url]);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete saved error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: Log fetch event
app.post('/api/fetch-log', async (req, res) => {
    const { source, articlesCount } = req.body;
    try {
        await pool.query(
            'INSERT INTO fetch_log (source, articles_count, fetched_at) VALUES ($1, $2, NOW())',
            [source || 'unknown', articlesCount || 0]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('Log fetch error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: Get fetch log
app.get('/api/fetch-log', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT * FROM fetch_log ORDER BY fetched_at DESC');
        res.json({ log: rows });
    } catch (error) {
        console.error('Get fetch log error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Serve saved page
app.get('/saved', (req, res) => {
    res.sendFile(path.join(__dirname, 'saved.html'));
});

// Serve settings page
app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'settings.html'));
});

// API: Get all settings
app.get('/api/settings', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT key, value FROM settings');
        const settings = {};
        rows.forEach(row => { settings[row.key] = row.value; });
        res.json({ settings });
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: Get single setting
app.get('/api/settings/:key', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT value FROM settings WHERE key = $1', [req.params.key]);
        if (rows.length === 0) return res.json({ value: null });
        res.json({ value: rows[0].value });
    } catch (error) {
        console.error('Get setting error:', error);
        res.status(500).json({ error: error.message });
    }
});

// RSS Feed sources
const RSS_FEEDS = [
    { name: 'Ethan Mollick', url: 'https://www.oneusefulthing.org/feed', category: 'AI Strategy' },
    { name: 'Benedict Evans', url: 'https://www.ben-evans.com/benedictevans?format=rss', category: 'Tech Strategy' },
    { name: 'Stratechery', url: 'https://stratechery.com/feed/', category: 'Strategy' },
    { name: 'Marginal Revolution', url: 'https://marginalrevolution.com/feed', category: 'Economics' },
    { name: 'Hugging Face', url: 'https://huggingface.co/blog/feed.xml', category: 'ML' },
    { name: 'Simon Willison', url: 'https://simonwillison.net/atom/everything/', category: 'AI Dev' },
    { name: 'Hamel Husain', url: 'https://hamel.dev/feed.xml', category: 'ML Engineering' },
    { name: 'Phil Schmid', url: 'https://www.philschmid.de/rss.xml', category: 'ML Engineering' },
    { name: 'Eugene Yan', url: 'https://eugeneyan.com/rss/', category: 'ML Systems' },
    { name: 'Lilian Weng', url: 'https://lilianweng.github.io/index.xml', category: 'AI Research' },
    { name: 'Interconnects', url: 'https://www.interconnects.ai/feed', category: 'AI News' },
    { name: 'Sebastian Raschka', url: 'https://magazine.sebastianraschka.com/feed', category: 'ML Research' },
    { name: 'Chip Huyen', url: 'https://huyenchip.com/feed.xml', category: 'MLOps' },
    { name: 'The Batch', url: 'https://www.deeplearning.ai/the-batch/feed/', category: 'AI News' },
];

// API: Fetch news from RSS feeds
app.post('/api/news/refresh', async (req, res) => {
    try {
        const results = [];
        const errors = [];

        for (const feed of RSS_FEEDS) {
            try {
                console.log(`Fetching: ${feed.name}`);
                const parsed = await rssParser.parseURL(feed.url);

                // Get last 5 articles from each feed
                const articles = (parsed.items || []).slice(0, 5).map(item => ({
                    source: feed.name,
                    category: feed.category,
                    title: item.title || 'Untitled',
                    url: item.link || item.guid,
                    description: (item.contentSnippet || item.content || '').substring(0, 200),
                    pubDate: item.pubDate || item.isoDate || new Date().toISOString()
                }));

                // Save to database
                for (const article of articles) {
                    await pool.query(
                        `INSERT INTO news_items (source, category, title, url, description, pub_date, fetched_at)
                         VALUES ($1, $2, $3, $4, $5, $6, NOW())
                         ON CONFLICT (url) DO UPDATE SET fetched_at = NOW()`,
                        [article.source, article.category, article.title, article.url, article.description, article.pubDate]
                    );
                }

                results.push({ source: feed.name, count: articles.length });
            } catch (feedError) {
                console.error(`Error fetching ${feed.name}:`, feedError.message);
                errors.push({ source: feed.name, error: feedError.message });
            }
        }

        res.json({ success: true, results, errors });
    } catch (error) {
        console.error('Refresh news error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: Get news items
app.get('/api/news', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT n.*, a.seen
            FROM news_items n
            LEFT JOIN articles a ON n.url = a.url
            WHERE n.pub_date > NOW() - INTERVAL '14 days'
            ORDER BY n.pub_date DESC
            LIMIT 100
        `);
        res.json({ news: rows });
    } catch (error) {
        console.error('Get news error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: Get news grouped by source
app.get('/api/news/grouped', async (req, res) => {
    try {
        const { rows } = await pool.query(`
            SELECT n.*, a.seen
            FROM news_items n
            LEFT JOIN articles a ON n.url = a.url
            WHERE n.pub_date > NOW() - INTERVAL '14 days'
            ORDER BY n.source, n.pub_date DESC
        `);

        // Group by source
        const grouped = {};
        rows.forEach(item => {
            if (!grouped[item.source]) {
                grouped[item.source] = { source: item.source, category: item.category, articles: [] };
            }
            if (grouped[item.source].articles.length < 2) {
                grouped[item.source].articles.push(item);
            }
        });

        res.json({ sources: Object.values(grouped) });
    } catch (error) {
        console.error('Get grouped news error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: Save settings
app.post('/api/settings', async (req, res) => {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
        return res.status(400).json({ error: 'Settings object required' });
    }
    try {
        for (const [key, value] of Object.entries(settings)) {
            await pool.query(
                `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
                 ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
                [key, JSON.stringify(value)]
            );
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Save settings error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
