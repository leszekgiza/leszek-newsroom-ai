require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk');
const { EdgeTTS } = require('node-edge-tts');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,pl;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove scripts, styles, nav, footer, ads
    $('script, style, nav, footer, header, aside, .ads, .advertisement, .sidebar, .comments').remove();

    // Try to find main article content
    let content = '';
    const selectors = ['article', 'main', '.post-content', '.entry-content', '.article-content', '.content', '[role="main"]'];

    for (const selector of selectors) {
        const el = $(selector);
        if (el.length && el.text().trim().length > 500) {
            content = el.text().trim();
            break;
        }
    }

    // Fallback to body if no article found
    if (!content) {
        content = $('body').text().trim();
    }

    // Clean up whitespace
    content = content.replace(/\s+/g, ' ').substring(0, 15000); // Limit to ~15k chars

    return content;
}

// API: Generate article summary using Claude
app.post('/api/summarize', async (req, res) => {
    try {
        const { url, title } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        if (!process.env.ANTHROPIC_API_KEY) {
            return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
        }

        // First, fetch the article content
        console.log(`Fetching article from: ${url}`);
        const articleContent = await fetchArticleContent(url);
        console.log(`Fetched ${articleContent.length} characters`);

        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            messages: [
                {
                    role: 'user',
                    content: `Przeanalizuj ponizszy artykul:

Tytul: ${title || 'Nieznany'}
URL: ${url}

Tresc artykulu:
${articleContent}

---

Prosze o:
1. **Streszczenie** (3-5 zdan) - kluczowe informacje z artykulu
2. **Kluczowe insighty** (3-5 punktow) - najwazniejsze wnioski i obserwacje
3. **Implikacje** (2-3 punkty) - co to oznacza dla branzy/czytelnika

Odpowiedz po polsku w formacie markdown.`
                }
            ]
        });

        const summary = message.content[0].text;
        res.json({ summary });
    } catch (error) {
        console.error('Summarize error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: Text-to-Speech using Edge TTS
app.post('/api/tts', async (req, res) => {
    try {
        const { text, voice = 'pl-PL-ZofiaNeural' } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        // Create temp file path
        const tempFile = path.join(DATA_DIR, `tts_${Date.now()}.mp3`);

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

        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': audioBuffer.length
        });
        res.send(audioBuffer);

    } catch (error) {
        console.error('TTS error:', error);
        res.status(500).json({ error: error.message });
    }
});

// API: List available TTS voices
app.get('/api/tts/voices', async (req, res) => {
    const polishVoices = [
        { id: 'pl-PL-ZofiaNeural', name: 'Zofia (kobieta)', gender: 'Female' },
        { id: 'pl-PL-MarekNeural', name: 'Marek (mezczyzna)', gender: 'Male' }
    ];
    res.json({ voices: polishVoices });
});

// API: Get all articles (with seen/new status)
app.get('/api/articles', async (req, res) => {
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
});

// API: Mark article as seen
app.post('/api/articles/seen', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });

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
});

// API: Save article for later
app.post('/api/saved', async (req, res) => {
    const { url, title, description } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });

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
});

// API: Get saved articles
app.get('/api/saved', async (req, res) => {
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
});

// API: Remove saved article
app.delete('/api/saved/:encodedUrl', async (req, res) => {
    const url = decodeURIComponent(req.params.encodedUrl);

    try {
        const { error } = await supabase
            .from('saved')
            .delete()
            .eq('url', url);

        if (error) throw error;
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
});

// API: Get fetch log
app.get('/api/fetch-log', async (req, res) => {
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
});

// Serve saved articles page
app.get('/saved', (req, res) => {
    res.sendFile(path.join(__dirname, 'saved.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`API endpoints:`);
    console.log(`  POST /api/summarize - Generate article summary`);
    console.log(`  POST /api/tts - Text-to-Speech`);
    console.log(`  GET  /api/tts/voices - List available voices`);
    console.log(`  GET  /api/articles - Get all articles with status`);
    console.log(`  POST /api/articles/seen - Mark article as seen`);
    console.log(`  GET  /api/saved - Get saved articles`);
    console.log(`  POST /api/saved - Save article for later`);
    console.log(`  DELETE /api/saved/:url - Remove saved article`);
    console.log(`  GET  /api/fetch-log - Get fetch history`);
    console.log(`  POST /api/fetch-log - Log fetch event`);
});
