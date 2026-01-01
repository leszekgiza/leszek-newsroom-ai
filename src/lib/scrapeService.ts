/**
 * Scrape Service - Client for Python Crawl4AI scraper
 */

const SCRAPER_URL = process.env.SCRAPER_URL || "http://localhost:8000";

export interface ScrapeResult {
  success: boolean;
  url: string;
  title?: string;
  markdown?: string;
  html_length: number;
  links_count: number;
  error?: string;
}

export interface ArticleInfo {
  url: string;
  title: string;
  date?: string;
  author?: string;
  excerpt?: string;
}

export interface ArticlesResult {
  success: boolean;
  source_url: string;
  articles: ArticleInfo[];
  error?: string;
}

/**
 * Scrape a single URL and get markdown content
 */
export async function scrapeUrl(
  url: string,
  options?: { waitFor?: string; timeout?: number }
): Promise<ScrapeResult> {
  try {
    const response = await fetch(`${SCRAPER_URL}/scrape`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        wait_for: options?.waitFor,
        timeout: options?.timeout || 30000,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        url,
        html_length: 0,
        links_count: 0,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    return await response.json();
  } catch (error) {
    return {
      success: false,
      url,
      html_length: 0,
      links_count: 0,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Source configuration for pattern-based filtering
 */
export interface SourceConfig {
  includePatterns?: string[];
  excludePatterns?: string[];
}

/**
 * Scrape a blog/news site and extract article list
 */
export async function scrapeArticlesList(
  url: string,
  maxArticles: number = 20,
  config?: SourceConfig | null
): Promise<ArticlesResult> {
  try {
    const response = await fetch(`${SCRAPER_URL}/scrape/articles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        max_articles: maxArticles,
        config: config || undefined,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        source_url: url,
        articles: [],
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const result = await response.json();

    // If config has patterns, filter articles client-side as backup
    if (config?.includePatterns && config.includePatterns.length > 0 && result.articles) {
      result.articles = result.articles.filter((article: ArticleInfo) => {
        try {
          const path = new URL(article.url).pathname;

          // Check exclude patterns first
          if (config.excludePatterns) {
            for (const pattern of config.excludePatterns) {
              if (path.includes(pattern)) {
                return false;
              }
            }
          }

          // Check include patterns
          for (const pattern of config.includePatterns!) {
            if (path.startsWith(pattern.replace(/\/$/, ""))) {
              return true;
            }
          }
          return false;
        } catch {
          return false;
        }
      });
    }

    return result;
  } catch (error) {
    return {
      success: false,
      source_url: url,
      articles: [],
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Check if scraper service is healthy
 */
export async function checkScraperHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${SCRAPER_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Phrases to filter out from intro (social media widgets, sharing buttons, etc.)
 */
const INTRO_BLACKLIST = [
  // English
  "thanks for sharing",
  "share on",
  "share this",
  "follow us",
  "subscribe",
  "click here",
  "read more",
  "sign up",
  "join our",
  "newsletter",
  "get updates",
  // Polish
  "podziel się",
  "udostępnij",
  "obserwuj nas",
  "zapisz się",
  "dołącz do",
  "czytaj więcej",
  "kliknij tutaj",
  // Common junk patterns
  "skip to content",
  "skip to main",
  "cookie",
  "privacy policy",
  "terms of service",
];

/**
 * Generate a 2-sentence intro from markdown content
 * Uses simple extraction - first meaningful paragraph
 */
export function extractIntro(markdown: string): string {
  if (!markdown) return "";

  // Remove headers
  let text = markdown.replace(/^#+\s+.+$/gm, "");

  // Remove links but keep text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Remove images
  text = text.replace(/!\[[^\]]*\]\([^)]+\)/g, "");

  // Remove bold/italic markers
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
  text = text.replace(/\*([^*]+)\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/_([^_]+)_/g, "$1");

  // Split into paragraphs and filter out junk
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 50) // Skip short paragraphs
    .filter((p) => {
      // Filter out paragraphs containing blacklisted phrases
      const lowerP = p.toLowerCase();
      return !INTRO_BLACKLIST.some((phrase) => lowerP.includes(phrase));
    });

  if (paragraphs.length === 0) return "";

  // Get first paragraph
  let intro = paragraphs[0];

  // Split into sentences
  const sentences = intro.match(/[^.!?]+[.!?]+/g) || [];

  // Return first 2 sentences
  if (sentences.length >= 2) {
    return sentences.slice(0, 2).join(" ").trim();
  }

  // If less than 2 sentences, return whole paragraph (limited)
  return intro.slice(0, 300);
}
