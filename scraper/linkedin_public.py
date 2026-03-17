"""
LinkedIn Public Profile Scraper
Scrapes public LinkedIn profiles for posts without authentication.
Uses Playwright with stealth config (no login required).
"""

import asyncio
import hashlib
import logging
import re
import time
from typing import Optional

from bs4 import BeautifulSoup
from fastapi import APIRouter
from playwright.async_api import async_playwright
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()

# Rate limiting: track last request time per profile
_last_request_time: dict[str, float] = {}
RATE_LIMIT_SECONDS = 5

# Reuse stealth config from linkedin_browser.py
STEALTH_SCRIPT = """
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
Object.defineProperty(navigator, 'languages', { get: () => ['pl-PL', 'pl', 'en-US', 'en'] });
Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
window.chrome = { runtime: {}, loadTimes: function(){}, csi: function(){} };
Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });
delete navigator.__proto__.webdriver;
"""

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)


# =============================================================================
# Pydantic Models
# =============================================================================

class PublicProfileRequest(BaseModel):
    public_id: str  # e.g. "leszekgiza"
    max_posts: int = 10


class PublicPost(BaseModel):
    content: str
    published_at: Optional[str] = None
    external_id: Optional[str] = None
    url: Optional[str] = None
    author: Optional[str] = None
    title: Optional[str] = None


class PublicProfileResponse(BaseModel):
    success: bool
    posts: list[PublicPost] = []
    profile_name: Optional[str] = None
    error: Optional[str] = None


# =============================================================================
# Endpoint
# =============================================================================

@router.post("/public-posts", response_model=PublicProfileResponse)
async def linkedin_public_posts(request: PublicProfileRequest):
    """Scrape public LinkedIn profile for posts (no auth required)."""
    public_id = request.public_id.strip().strip("/")

    if not public_id or not re.match(r'^[a-zA-Z0-9_-]+$', public_id):
        return PublicProfileResponse(
            success=False,
            error="Nieprawidłowy identyfikator profilu"
        )

    # Rate limiting
    now = time.time()
    last_time = _last_request_time.get(public_id, 0)
    if now - last_time < RATE_LIMIT_SECONDS:
        wait = RATE_LIMIT_SECONDS - (now - last_time)
        await asyncio.sleep(wait)
    _last_request_time[public_id] = time.time()

    browser = None
    try:
        url = f"https://www.linkedin.com/in/{public_id}/"
        logger.info(f"[LINKEDIN-PUBLIC] Scraping profile: {url}")

        pw = await async_playwright().start()
        browser = await pw.chromium.launch(
            headless=True,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = await browser.new_context(
            user_agent=USER_AGENT,
            viewport={"width": 1920, "height": 1080},
            locale="en-US",
            timezone_id="Europe/Warsaw",
        )
        page = await context.new_page()
        await page.add_init_script(STEALTH_SCRIPT)

        # Navigate with domcontentloaded (NOT networkidle — LinkedIn never reaches it)
        response = await page.goto(url, wait_until="domcontentloaded", timeout=30000)

        if response and response.status == 999:
            await browser.close()
            return PublicProfileResponse(
                success=False,
                error="LinkedIn zablokował żądanie (status 999). Spróbuj ponownie później."
            )

        # Wait for content to render
        await page.wait_for_timeout(3000)

        # Scroll down to load more posts
        for _ in range(3):
            await page.evaluate("window.scrollBy(0, 800)")
            await page.wait_for_timeout(1000)

        html = await page.content()
        await browser.close()
        browser = None

        # Parse HTML
        soup = BeautifulSoup(html, 'html.parser')

        # Extract profile name
        profile_name = _extract_profile_name(soup)

        # Extract posts
        posts = _extract_posts(soup, public_id, request.max_posts)

        logger.info(f"[LINKEDIN-PUBLIC] Found {len(posts)} posts for {public_id}")

        return PublicProfileResponse(
            success=True,
            posts=posts,
            profile_name=profile_name,
        )

    except Exception as e:
        logger.error(f"[LINKEDIN-PUBLIC] Error scraping {public_id}: {e}")
        return PublicProfileResponse(
            success=False,
            error=str(e),
        )
    finally:
        if browser:
            try:
                await browser.close()
            except Exception:
                pass


# =============================================================================
# HTML Parsing
# =============================================================================

def _extract_profile_name(soup: BeautifulSoup) -> Optional[str]:
    """Extract profile name from LinkedIn public profile HTML."""
    # Try the main heading (h1 with the person's name)
    h1 = soup.find("h1")
    if h1:
        name = h1.get_text(strip=True)
        if name and len(name) < 100:
            return name

    # Fallback: og:title meta tag
    og_title = soup.find("meta", property="og:title")
    if og_title and og_title.get("content"):
        # Usually "Name - Title | LinkedIn"
        title = og_title["content"].split(" - ")[0].split(" | ")[0].strip()
        if title:
            return title

    return None


def _extract_posts(soup: BeautifulSoup, public_id: str, max_posts: int) -> list[PublicPost]:
    """Extract posts from LinkedIn public profile HTML."""
    posts = []

    # LinkedIn public profiles show "Recent Activity" section
    # Posts are in various containers depending on profile layout

    # Strategy 1: Look for post containers with data-urn attributes
    post_elements = soup.find_all(attrs={"data-urn": re.compile(r"urn:li:activity:")})
    for elem in post_elements[:max_posts]:
        post = _parse_post_element(elem, public_id)
        if post:
            posts.append(post)

    # Strategy 2: Look for <div> or <article> with activity content
    if not posts:
        # Look for spans/divs with substantial text in activity sections
        activity_section = soup.find(string=re.compile(r"Activity|Aktywność|Recent posts", re.I))
        if activity_section:
            # Find the parent container
            container = activity_section
            for _ in range(10):
                container = container.parent
                if container is None:
                    break
                # Look for text blocks within this section
                text_blocks = container.find_all(["span", "div", "p"], string=True)
                for block in text_blocks:
                    text = block.get_text(strip=True)
                    if len(text) > 50 and not _is_ui_text(text):
                        # Check if we already have this content
                        if any(text[:80] in p.content for p in posts):
                            continue
                        ext_id = hashlib.md5(text[:200].encode()).hexdigest()[:16]
                        posts.append(PublicPost(
                            content=text,
                            external_id=ext_id,
                            title=text[:120],
                            url=f"https://www.linkedin.com/in/{public_id}/recent-activity/",
                        ))
                        if len(posts) >= max_posts:
                            break
                if posts:
                    break

    # Strategy 3: Generic text extraction from visible post-like content
    if not posts:
        # Look for any substantial text blocks that look like posts
        for elem in soup.find_all(["span", "div"], class_=re.compile(r"break-words|feed-shared|update-components")):
            text = elem.get_text(strip=True)
            if len(text) > 80 and not _is_ui_text(text):
                if any(text[:80] in p.content for p in posts):
                    continue
                ext_id = hashlib.md5(text[:200].encode()).hexdigest()[:16]
                posts.append(PublicPost(
                    content=text,
                    external_id=ext_id,
                    title=text[:120],
                    url=f"https://www.linkedin.com/in/{public_id}/recent-activity/",
                ))
                if len(posts) >= max_posts:
                    break

    return posts


def _parse_post_element(elem, public_id: str) -> Optional[PublicPost]:
    """Parse a single post element with data-urn attribute."""
    urn = elem.get("data-urn", "")

    # Extract activity ID
    activity_match = re.search(r"urn:li:activity:(\d+)", urn)
    activity_id = activity_match.group(1) if activity_match else None

    # Get text content
    text_spans = elem.find_all(["span", "div"], class_=re.compile(r"break-words|visually-hidden", re.I))
    content = ""
    for span in text_spans:
        t = span.get_text(strip=True)
        if len(t) > len(content) and not _is_ui_text(t):
            content = t

    if not content:
        content = elem.get_text(strip=True)

    if not content or len(content) < 20 or _is_ui_text(content):
        return None

    external_id = activity_id or hashlib.md5(content[:200].encode()).hexdigest()[:16]
    url = f"https://www.linkedin.com/feed/update/urn:li:activity:{activity_id}" if activity_id else f"https://www.linkedin.com/in/{public_id}/recent-activity/"

    # Try to extract timestamp
    time_elem = elem.find("time")
    published_at = None
    if time_elem:
        published_at = time_elem.get("datetime")

    return PublicPost(
        content=content,
        external_id=external_id,
        title=content[:120],
        url=url,
        published_at=published_at,
    )


def _is_ui_text(text: str) -> bool:
    """Check if text is likely a UI element rather than post content."""
    ui_patterns = [
        "like", "comment", "repost", "share", "send",
        "follow", "connect", "message", "more",
        "sign in", "join now", "log in", "sign up",
        "see all", "show more", "show less",
        "linkedin", "© ", "privacy", "terms",
        "agree", "cookie", "polubień", "komentarz",
        "udostępnień", "obserwuj", "wiadomość",
    ]
    text_lower = text.lower().strip()
    # Short UI texts
    if len(text_lower) < 30:
        return any(p in text_lower for p in ui_patterns)
    return False
