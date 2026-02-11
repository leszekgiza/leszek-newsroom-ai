"""
Crawl4AI Scraper Service
FastAPI microservice for web scraping using Crawl4AI
"""

import asyncio
import re
from datetime import datetime
from typing import Optional
from urllib.parse import urljoin, urlparse

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode
from bs4 import BeautifulSoup
import aiohttp

from linkedin_service import router as linkedin_router
from twitter_service import router as twitter_router

app = FastAPI(
    title="Crawl4AI Scraper Service",
    description="Web scraping microservice for Newsroom AI",
    version="1.0.0"
)

# CORS for Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount connector routers
app.include_router(linkedin_router, prefix="/linkedin", tags=["linkedin"])
app.include_router(twitter_router, prefix="/twitter", tags=["twitter"])

# =============================================================================
# Models
# =============================================================================

class ScrapeRequest(BaseModel):
    url: HttpUrl
    wait_for: Optional[str] = None  # CSS selector to wait for
    timeout: int = 30000  # ms

class ScrapeResponse(BaseModel):
    success: bool
    url: str
    title: Optional[str] = None
    markdown: Optional[str] = None
    html_length: int = 0
    links_count: int = 0
    error: Optional[str] = None

class ArticleInfo(BaseModel):
    url: str
    title: str
    date: Optional[str] = None
    author: Optional[str] = None
    excerpt: Optional[str] = None

class ArticlesRequest(BaseModel):
    url: HttpUrl
    max_articles: int = 20

class ArticlesResponse(BaseModel):
    success: bool
    source_url: str
    articles: list[ArticleInfo] = []
    error: Optional[str] = None

# =============================================================================
# Browser Configuration
# =============================================================================

def get_browser_config() -> BrowserConfig:
    return BrowserConfig(
        headless=True,
        viewport_width=1920,
        viewport_height=1080,
        user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    )

def get_crawler_config(wait_for: Optional[str] = None, timeout: int = 60000, fast_mode: bool = False) -> CrawlerRunConfig:
    """
    Get crawler configuration.
    fast_mode=True uses 'domcontentloaded' instead of 'networkidle' for faster loading
    on sites with many ads/trackers (like strefainwestorow.pl)
    """
    config = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        page_timeout=timeout,
        wait_until="domcontentloaded" if fast_mode else "networkidle",
        delay_before_return_html=1.0 if fast_mode else 2.0,
        remove_overlay_elements=True,
        excluded_tags=["script", "style", "noscript"]  # Keep nav, footer for links
    )
    if wait_for:
        config.wait_for = f"css:{wait_for}"
    return config

# =============================================================================
# Endpoints
# =============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "crawl4ai-scraper", "timestamp": datetime.utcnow().isoformat()}

@app.post("/scrape", response_model=ScrapeResponse)
async def scrape_url(request: ScrapeRequest):
    """
    Scrape a single URL and return markdown content
    """
    url = str(request.url)

    try:
        browser_config = get_browser_config()
        crawler_config = get_crawler_config(request.wait_for, request.timeout)

        async with AsyncWebCrawler(config=browser_config) as crawler:
            result = await crawler.arun(url=url, config=crawler_config)

            if result.success:
                # Extract title from metadata or markdown
                title = result.metadata.get("title") if result.metadata else None
                if not title and result.markdown:
                    # Try to extract from first heading
                    match = re.search(r'^#\s+(.+)$', result.markdown, re.MULTILINE)
                    if match:
                        title = match.group(1).strip()

                return ScrapeResponse(
                    success=True,
                    url=url,
                    title=title,
                    markdown=result.markdown,
                    html_length=len(result.html) if result.html else 0,
                    links_count=len(result.links.get("internal", [])) + len(result.links.get("external", []))
                )
            else:
                return ScrapeResponse(
                    success=False,
                    url=url,
                    error=result.error_message or "Unknown error"
                )

    except Exception as e:
        return ScrapeResponse(
            success=False,
            url=url,
            error=str(e)
        )

@app.post("/scrape/articles", response_model=ArticlesResponse)
async def scrape_articles(request: ArticlesRequest):
    """
    Scrape a blog/news site and extract list of article links
    """
    url = str(request.url)
    base_url = f"{urlparse(url).scheme}://{urlparse(url).netloc}"

    try:
        browser_config = get_browser_config()
        # Use fast_mode=True for article list scraping (doesn't need full page load)
        crawler_config = get_crawler_config(timeout=60000, fast_mode=True)

        async with AsyncWebCrawler(config=browser_config) as crawler:
            result = await crawler.arun(url=url, config=crawler_config)

            if not result.success:
                return ArticlesResponse(
                    success=False,
                    source_url=url,
                    error=result.error_message or "Failed to scrape page"
                )

            articles = []
            seen_urls = set()

            # Extract links from the page - try result.links first, fallback to HTML parsing
            all_links = result.links.get("internal", []) + result.links.get("external", [])

            # If few article-like links found, try fetching HTML directly with aiohttp
            article_links_count = sum(1 for l in all_links if isinstance(l, dict) and '/posts/' in l.get('href', '') or '/wiadomosci/' in l.get('href', ''))

            if article_links_count < 3:
                try:
                    async with aiohttp.ClientSession() as session:
                        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"}
                        async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                            if resp.status == 200:
                                html_content = await resp.text()
                                soup = BeautifulSoup(html_content, 'html.parser')
                                all_links = []
                                for a_tag in soup.find_all('a', href=True):
                                    href = a_tag.get('href', '')
                                    text = a_tag.get_text(strip=True)
                                    if href:
                                        all_links.append({"href": href, "text": text})
                except Exception:
                    pass  # Fall back to Crawl4AI results

            for link in all_links:
                # Handle both dict and string formats
                if isinstance(link, dict):
                    href = link.get("href", "")
                    text = link.get("text", "").strip()
                else:
                    href = str(link)
                    text = ""

                if not href:
                    continue

                # Make absolute URL
                if href.startswith("/"):
                    href = urljoin(base_url, href)
                elif not href.startswith("http"):
                    continue

                # Skip if already seen
                if href in seen_urls:
                    continue
                seen_urls.add(href)

                # Filter for article-like URLs
                is_article = is_article_url(href, base_url)
                if is_article:
                    # Clean up title
                    title = text if text else extract_title_from_url(href)
                    if title and len(title) > 10:  # Minimum title length
                        # Try to extract date from URL
                        article_date = extract_date_from_url(href)
                        articles.append(ArticleInfo(
                            url=href,
                            title=title[:200],  # Limit title length
                            date=article_date,
                            author=None,
                            excerpt=None
                        ))

                if len(articles) >= request.max_articles:
                    break

            return ArticlesResponse(
                success=True,
                source_url=url,
                articles=articles
            )

    except Exception as e:
        return ArticlesResponse(
            success=False,
            source_url=url,
            error=str(e)
        )

# =============================================================================
# Helper Functions
# =============================================================================

def is_article_url(url: str, base_url: str) -> bool:
    """
    Heuristic to determine if URL is likely an article
    """
    parsed = urlparse(url)
    path = parsed.path.lower()

    # Must be from same domain or known blog platforms
    if not url.startswith(base_url):
        # Allow substack, medium, etc.
        known_platforms = ["substack.com", "medium.com", "ghost.io"]
        if not any(platform in url for platform in known_platforms):
            return False

    # Exclude common non-article paths
    excluded_patterns = [
        "/tag/", "/tags/", "/category/", "/categories/",
        "/author/", "/about", "/contact", "/privacy",
        "/terms", "/search", "/login", "/register",
        "/feed", "/rss", "/sitemap", "/archive",
        ".xml", ".json", ".js", ".css", ".png", ".jpg", ".gif",
        "/page/", "/wp-admin", "/wp-content"
    ]

    for pattern in excluded_patterns:
        if pattern in path:
            return False

    # Positive patterns for articles
    article_patterns = [
        "/p/",  # Substack
        "/post/", "/posts/",
        "/blog/",
        "/article/", "/articles/",
        "/news/",
        "/wiadomosci/",  # Polish news sites
        "/wydarzenia/",  # Polish events
        r"/\d{4}/",  # Year in path like /2024/
        r"/\d{8}/",  # Date in path like /20251231/
    ]

    for pattern in article_patterns:
        if re.search(pattern, path):
            return True

    # Check for slug-like paths (words separated by hyphens)
    # e.g., /some-article-title or /2024/12/some-article
    slug_pattern = r'/[\w]+-[\w]+'
    if re.search(slug_pattern, path):
        return True

    return False

def extract_title_from_url(url: str) -> str:
    """
    Extract a readable title from URL path
    """
    parsed = urlparse(url)
    path = parsed.path.strip("/")

    if not path:
        return ""

    # Get last segment
    segments = path.split("/")
    slug = segments[-1]

    # Remove file extensions
    slug = re.sub(r'\.[^.]+$', '', slug)

    # Replace hyphens/underscores with spaces
    title = slug.replace("-", " ").replace("_", " ")

    # Capitalize
    title = title.title()

    return title


def extract_date_from_url(url: str) -> Optional[str]:
    """
    Extract publication date from URL if present
    Returns ISO date string (YYYY-MM-DD) or None
    """
    path = urlparse(url).path

    # Pattern 1: /YYYY/MM/DD/ or /YYYY-MM-DD/
    match = re.search(r'/(\d{4})[/-](\d{2})[/-](\d{2})(?:/|$|-)', path)
    if match:
        return f"{match.group(1)}-{match.group(2)}-{match.group(3)}"

    # Pattern 2: /YYYYMMDD/ (like strefainwestorow.pl /wiadomosci/20251231/)
    match = re.search(r'/(\d{4})(\d{2})(\d{2})/', path)
    if match:
        return f"{match.group(1)}-{match.group(2)}-{match.group(3)}"

    # Pattern 3: /posts/YYYY-MM-DD-slug/ (like lilianweng.github.io)
    match = re.search(r'/posts?/(\d{4})-(\d{2})-(\d{2})', path)
    if match:
        return f"{match.group(1)}-{match.group(2)}-{match.group(3)}"

    # Pattern 4: /YYYY/Mon/DD/ (like simonwillison.net /2024/Dec/31/)
    month_map = {
        'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
        'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
        'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    }
    match = re.search(r'/(\d{4})/([A-Za-z]{3})/(\d{1,2})(?:/|$)', path)
    if match:
        year = match.group(1)
        month_str = match.group(2).lower()
        day = match.group(3).zfill(2)
        if month_str in month_map:
            return f"{year}-{month_map[month_str]}-{day}"

    return None


def extract_date_from_content(html: str, markdown: str) -> Optional[str]:
    """
    Extract publication date from article content (HTML or markdown)
    Returns ISO date string (YYYY-MM-DD) or None
    """
    # Common date patterns in content
    # Pattern: "Dec 20, 2025" or "December 20, 2025"
    month_map = {
        'january': '01', 'jan': '01',
        'february': '02', 'feb': '02',
        'march': '03', 'mar': '03',
        'april': '04', 'apr': '04',
        'may': '05',
        'june': '06', 'jun': '06',
        'july': '07', 'jul': '07',
        'august': '08', 'aug': '08',
        'september': '09', 'sep': '09',
        'october': '10', 'oct': '10',
        'november': '11', 'nov': '11',
        'december': '12', 'dec': '12'
    }

    # Search in first 2000 chars of content
    content = (markdown or html or "")[:2000].lower()

    # Pattern: "Dec 20, 2025" or "December 20, 2025"
    match = re.search(r'(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2}),?\s+(\d{4})', content)
    if match:
        month = month_map.get(match.group(1))
        day = match.group(2).zfill(2)
        year = match.group(3)
        if month and 2020 <= int(year) <= 2030:
            return f"{year}-{month}-{day}"

    # Pattern: "20 Dec 2025" or "20 December 2025"
    match = re.search(r'(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})', content)
    if match:
        day = match.group(1).zfill(2)
        month = month_map.get(match.group(2))
        year = match.group(3)
        if month and 2020 <= int(year) <= 2030:
            return f"{year}-{month}-{day}"

    # Pattern: "2025-12-20" ISO format
    match = re.search(r'(\d{4})-(\d{2})-(\d{2})', content)
    if match:
        year, month, day = match.groups()
        if 2020 <= int(year) <= 2030 and 1 <= int(month) <= 12 and 1 <= int(day) <= 31:
            return f"{year}-{month}-{day}"

    return None

# =============================================================================
# Main
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
