"""
LinkedIn Browser Login Service
Playwright-based browser automation for LinkedIn auth with 2FA support.
"""

import asyncio
import base64
import uuid
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple

from fastapi import APIRouter
from pydantic import BaseModel
from playwright.async_api import async_playwright, Browser, BrowserContext, Page

router = APIRouter()

# =============================================================================
# Config
# =============================================================================

SESSION_TTL_MINUTES = 5
MAX_CONCURRENT_SESSIONS = 5

_semaphore = asyncio.Semaphore(MAX_CONCURRENT_SESSIONS)

# session_id -> (browser, context, page, created_at)
_browser_sessions: Dict[str, Tuple[Browser, BrowserContext, Page, datetime]] = {}


# =============================================================================
# Pydantic Models
# =============================================================================

class BrowserLoginStartRequest(BaseModel):
    email: str
    password: str


class BrowserLoginStartResponse(BaseModel):
    success: bool
    session_id: Optional[str] = None
    state: str  # success, 2fa_email, 2fa_sms, 2fa_app, 2fa_unknown, captcha, failed
    li_at: Optional[str] = None
    profile_name: Optional[str] = None
    screenshot: Optional[str] = None  # base64
    error: Optional[str] = None


class BrowserLoginVerifyRequest(BaseModel):
    session_id: str
    code: str


class BrowserLoginVerifyResponse(BaseModel):
    success: bool
    state: str
    li_at: Optional[str] = None
    profile_name: Optional[str] = None
    screenshot: Optional[str] = None
    error: Optional[str] = None


class BrowserLoginCloseRequest(BaseModel):
    session_id: str


class BrowserLoginCloseResponse(BaseModel):
    success: bool


# =============================================================================
# Session Management
# =============================================================================

async def _cleanup_expired():
    """Remove sessions older than TTL."""
    now = datetime.utcnow()
    expired = [
        sid for sid, (_, _, _, created) in _browser_sessions.items()
        if now - created > timedelta(minutes=SESSION_TTL_MINUTES)
    ]
    for sid in expired:
        await _close_session(sid)


async def _close_session(session_id: str):
    """Close browser and remove session."""
    entry = _browser_sessions.pop(session_id, None)
    if entry:
        browser, context, page, _ = entry
        try:
            await page.close()
        except Exception:
            pass
        try:
            await context.close()
        except Exception:
            pass
        try:
            await browser.close()
        except Exception:
            pass


# =============================================================================
# Stealth Helpers
# =============================================================================

STEALTH_SCRIPT = """
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en', 'pl'] });
Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
window.chrome = { runtime: {} };
"""

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)


async def _create_stealth_browser() -> Tuple[Browser, BrowserContext, Page]:
    """Launch Chromium with stealth configuration."""
    pw = await async_playwright().start()
    browser = await pw.chromium.launch(headless=True)
    context = await browser.new_context(
        user_agent=USER_AGENT,
        viewport={"width": 1920, "height": 1080},
        locale="en-US",
        timezone_id="Europe/Warsaw",
    )
    page = await context.new_page()
    await page.add_init_script(STEALTH_SCRIPT)
    return browser, context, page


# =============================================================================
# State Detection
# =============================================================================

async def _detect_state(page: Page) -> Tuple[str, Optional[str]]:
    """Detect page state after navigation. Returns (state, error_message)."""
    url = page.url.lower()

    # Success - redirected to feed
    if "/feed" in url or "/mynetwork" in url:
        return "success", None

    # 2FA / checkpoint
    if "/checkpoint" in url or "/challenge" in url:
        content = await page.content()
        content_lower = content.lower()

        if "email" in content_lower and ("verification" in content_lower or "verify" in content_lower or "pin" in content_lower):
            return "2fa_email", None
        if "sms" in content_lower or "text message" in content_lower or "phone" in content_lower:
            return "2fa_sms", None
        if "authenticator" in content_lower or "authentication app" in content_lower or "totp" in content_lower:
            return "2fa_app", None
        return "2fa_unknown", None

    # CAPTCHA
    if "captcha" in url or "security-verification" in url:
        return "captcha", None

    # Still on login page - check for error messages
    if "/login" in url or "/uas" in url:
        error_msg = None
        # Use specific login error selectors (avoid catching cookie consent banner)
        for selector in [
            '#error-for-username',
            '#error-for-password',
            '.form__label--error',
            '.alert-content',
            'div[role="alert"] p',
        ]:
            try:
                error_el = await page.query_selector(selector)
                if error_el:
                    text = (await error_el.inner_text()).strip()
                    if text and "cookie" not in text.lower() and len(text) < 200:
                        error_msg = text
                        break
            except Exception:
                continue
        return "failed", error_msg or "Login failed"

    # Unknown state
    return "failed", f"Unexpected page: {page.url}"


async def _extract_li_at(context: BrowserContext) -> Optional[str]:
    """Extract li_at cookie from browser context."""
    cookies = await context.cookies("https://www.linkedin.com")
    for cookie in cookies:
        if cookie["name"] == "li_at":
            return cookie["value"]
    return None


async def _get_profile_name(li_at: str) -> Optional[str]:
    """Get profile name using linkedin-api with the li_at cookie."""
    try:
        from linkedin_api import Linkedin
        api = await asyncio.to_thread(
            Linkedin, "", "", cookies={"li_at": li_at}
        )
        profile = await asyncio.to_thread(api.get_user_profile)
        first = profile.get("firstName", "")
        last = profile.get("lastName", "")
        name = f"{first} {last}".strip()
        return name if name else None
    except Exception:
        return None


async def _take_screenshot_b64(page: Page) -> Optional[str]:
    """Take a screenshot and return as base64 string."""
    try:
        screenshot_bytes = await page.screenshot(type="png")
        return base64.b64encode(screenshot_bytes).decode("utf-8")
    except Exception:
        return None


# =============================================================================
# Endpoints
# =============================================================================

@router.post("/browser-login/start", response_model=BrowserLoginStartResponse)
async def browser_login_start(request: BrowserLoginStartRequest):
    """Start browser-based LinkedIn login. Handles 2FA detection."""
    await _cleanup_expired()

    if len(_browser_sessions) >= MAX_CONCURRENT_SESSIONS:
        return BrowserLoginStartResponse(
            success=False,
            state="failed",
            error="Too many active browser sessions. Try again later.",
        )

    async with _semaphore:
        browser = None
        try:
            browser, context, page = await _create_stealth_browser()

            # Navigate to LinkedIn login
            await page.goto("https://www.linkedin.com/login", wait_until="networkidle", timeout=15000)

            # Dismiss cookie consent dialog if present
            for consent_label in ["Reject", "Odrzuć", "Accept", "Akceptuj"]:
                try:
                    btn = page.get_by_role("button", name=consent_label, exact=True)
                    if await btn.count() > 0:
                        await btn.first.click(timeout=3000)
                        await page.wait_for_load_state("networkidle", timeout=5000)
                        break
                except Exception:
                    continue

            # Debug: check if login form is visible
            username_input = await page.query_selector('input#username')
            if not username_input:
                # Maybe cookie consent still showing - take screenshot for debug
                screenshot = await _take_screenshot_b64(page)
                # Try force-clicking via JS on any visible button
                await page.evaluate("""() => {
                    const btns = Array.from(document.querySelectorAll('button'));
                    const reject = btns.find(b => /reject|odrzuć/i.test(b.textContent));
                    const accept = btns.find(b => /accept|akceptuj/i.test(b.textContent));
                    (reject || accept)?.click();
                }""")
                await asyncio.sleep(2)
                # Check again
                username_input = await page.query_selector('input#username')
                if not username_input:
                    await page.close()
                    await context.close()
                    await browser.close()
                    return BrowserLoginStartResponse(
                        success=False,
                        state="failed",
                        screenshot=screenshot,
                        error="Login form not found - cookie consent may be blocking",
                    )

            # Fill credentials
            await page.fill('input#username', request.email)
            await asyncio.sleep(0.3)
            await page.fill('input#password', request.password)
            await asyncio.sleep(0.5)

            # Click sign in
            await page.click('button[type="submit"]')

            # Wait for navigation
            try:
                await page.wait_for_load_state("networkidle", timeout=15000)
            except Exception:
                # Timeout is ok - page might still be loading
                await asyncio.sleep(2)

            # Detect state
            state, error_msg = await _detect_state(page)

            if state == "success":
                li_at = await _extract_li_at(context)
                profile_name = await _get_profile_name(li_at) if li_at else None

                # Close browser - no longer needed
                await page.close()
                await context.close()
                await browser.close()

                return BrowserLoginStartResponse(
                    success=True,
                    state="success",
                    li_at=li_at,
                    profile_name=profile_name,
                )

            if state.startswith("2fa"):
                # Keep session alive for verify step
                session_id = str(uuid.uuid4())
                _browser_sessions[session_id] = (browser, context, page, datetime.utcnow())

                return BrowserLoginStartResponse(
                    success=False,
                    session_id=session_id,
                    state=state,
                )

            if state == "captcha":
                screenshot = await _take_screenshot_b64(page)
                await page.close()
                await context.close()
                await browser.close()

                return BrowserLoginStartResponse(
                    success=False,
                    state="captcha",
                    screenshot=screenshot,
                    error="LinkedIn is showing a CAPTCHA.",
                )

            # Failed
            await page.close()
            await context.close()
            await browser.close()

            return BrowserLoginStartResponse(
                success=False,
                state="failed",
                error=error_msg or "Login failed",
            )

        except Exception as e:
            if browser:
                try:
                    await browser.close()
                except Exception:
                    pass
            return BrowserLoginStartResponse(
                success=False,
                state="failed",
                error=str(e),
            )


@router.post("/browser-login/verify", response_model=BrowserLoginVerifyResponse)
async def browser_login_verify(request: BrowserLoginVerifyRequest):
    """Submit 2FA verification code."""
    entry = _browser_sessions.get(request.session_id)
    if not entry:
        return BrowserLoginVerifyResponse(
            success=False,
            state="failed",
            error="Session not found or expired",
        )

    browser, context, page, created_at = entry

    # Check TTL
    if datetime.utcnow() - created_at > timedelta(minutes=SESSION_TTL_MINUTES):
        await _close_session(request.session_id)
        return BrowserLoginVerifyResponse(
            success=False,
            state="failed",
            error="Session expired",
        )

    try:
        # Find and fill the verification code input (try multiple selectors)
        code_selectors = [
            'input#input__email_verification_pin',
            'input#input__phone_verification_pin',
            'input[name="pin"]',
            'input[name="verificationCode"]',
            'input[type="text"]',
        ]

        filled = False
        for selector in code_selectors:
            try:
                el = await page.query_selector(selector)
                if el and await el.is_visible():
                    await el.fill(request.code)
                    filled = True
                    break
            except Exception:
                continue

        if not filled:
            screenshot = await _take_screenshot_b64(page)
            return BrowserLoginVerifyResponse(
                success=False,
                state="failed",
                screenshot=screenshot,
                error="Could not find verification code input",
            )

        await asyncio.sleep(0.5)

        # Click submit button (try multiple selectors)
        submit_selectors = [
            'button[type="submit"]',
            'button#two-step-submit-button',
            'button.btn__primary--large',
            'form button',
        ]

        for selector in submit_selectors:
            try:
                btn = await page.query_selector(selector)
                if btn and await btn.is_visible():
                    await btn.click()
                    break
            except Exception:
                continue

        # Wait for navigation
        try:
            await page.wait_for_load_state("networkidle", timeout=15000)
        except Exception:
            await asyncio.sleep(2)

        # Detect state
        state, error_msg = await _detect_state(page)

        if state == "success":
            li_at = await _extract_li_at(context)
            profile_name = await _get_profile_name(li_at) if li_at else None

            # Close session
            await _close_session(request.session_id)

            return BrowserLoginVerifyResponse(
                success=True,
                state="success",
                li_at=li_at,
                profile_name=profile_name,
            )

        # Still on 2FA or failed
        screenshot = await _take_screenshot_b64(page) if state == "failed" else None
        return BrowserLoginVerifyResponse(
            success=False,
            state=state,
            screenshot=screenshot,
            error=error_msg,
        )

    except Exception as e:
        await _close_session(request.session_id)
        return BrowserLoginVerifyResponse(
            success=False,
            state="failed",
            error=str(e),
        )


@router.post("/browser-login/close", response_model=BrowserLoginCloseResponse)
async def browser_login_close(request: BrowserLoginCloseRequest):
    """Close a browser login session."""
    await _close_session(request.session_id)
    return BrowserLoginCloseResponse(success=True)
