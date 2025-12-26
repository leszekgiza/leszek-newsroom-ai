const Anthropic = require('@anthropic-ai/sdk');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

async function fetchArticleContent(url) {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,pl;q=0.8'
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    $('script, style, nav, footer, header, aside, .ads, .advertisement, .sidebar, .comments').remove();

    let content = '';
    const selectors = ['article', 'main', '.post-content', '.entry-content', '.article-content', '.content', '[role="main"]'];

    for (const selector of selectors) {
        const el = $(selector);
        if (el.length && el.text().trim().length > 500) {
            content = el.text().trim();
            break;
        }
    }

    if (!content) {
        content = $('body').text().trim();
    }

    content = content.replace(/\s+/g, ' ').substring(0, 15000);
    return content;
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { url, title } = req.body;

        if (!url) {
            return res.status(400).json({ error: 'URL is required' });
        }

        if (!process.env.ANTHROPIC_API_KEY) {
            return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
        }

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
};
