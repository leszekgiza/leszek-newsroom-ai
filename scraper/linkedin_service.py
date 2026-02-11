"""
LinkedIn Connector Service
FastAPI router for LinkedIn Voyager API integration via linkedin-api library.
Session cache in memory with TTL.
"""

import asyncio
import hashlib
import random
import uuid
from datetime import datetime, timedelta
from typing import Dict, Optional, Tuple

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# =============================================================================
# Session Cache (in-memory, TTL 60min, max 100 sessions)
# =============================================================================

SESSION_TTL_MINUTES = 60
MAX_SESSIONS = 100

# session_id -> (Linkedin instance, created_at)
_sessions: Dict[str, Tuple[object, datetime]] = {}


def _cleanup_sessions():
    """Remove expired sessions."""
    now = datetime.utcnow()
    expired = [
        sid for sid, (_, created) in _sessions.items()
        if now - created > timedelta(minutes=SESSION_TTL_MINUTES)
    ]
    for sid in expired:
        _sessions.pop(sid, None)

    # Evict oldest if over limit
    if len(_sessions) > MAX_SESSIONS:
        sorted_sessions = sorted(_sessions.items(), key=lambda x: x[1][1])
        for sid, _ in sorted_sessions[:len(_sessions) - MAX_SESSIONS]:
            _sessions.pop(sid, None)


def _get_session(session_id: str):
    """Get LinkedIn session by ID, or raise 404."""
    _cleanup_sessions()
    entry = _sessions.get(session_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    api, created = entry
    if datetime.utcnow() - created > timedelta(minutes=SESSION_TTL_MINUTES):
        _sessions.pop(session_id, None)
        raise HTTPException(status_code=410, detail="Session expired")
    return api


# =============================================================================
# Pydantic Models
# =============================================================================

class LinkedInAuthRequest(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    li_at_cookie: Optional[str] = None


class LinkedInAuthResponse(BaseModel):
    success: bool
    profile_name: Optional[str] = None
    session_id: Optional[str] = None
    error: Optional[str] = None


class LinkedInFetchRequest(BaseModel):
    session_id: str
    max_posts: int = 30
    hashtags: Optional[list[str]] = None
    include_reposts: bool = False


class LinkedInPost(BaseModel):
    external_id: str
    title: str
    content: str
    url: str
    author: Optional[str] = None
    published_at: Optional[str] = None


class LinkedInFetchResponse(BaseModel):
    success: bool
    posts: list[LinkedInPost] = []
    fetched_count: int = 0
    error: Optional[str] = None


class LinkedInTestRequest(BaseModel):
    session_id: str


class LinkedInTestResponse(BaseModel):
    success: bool
    profile_name: Optional[str] = None
    error: Optional[str] = None


class LinkedInDisconnectRequest(BaseModel):
    session_id: str


class LinkedInDisconnectResponse(BaseModel):
    success: bool


# =============================================================================
# Endpoints
# =============================================================================

@router.post("/auth", response_model=LinkedInAuthResponse)
async def linkedin_auth(request: LinkedInAuthRequest):
    """Authenticate with LinkedIn via email/password or li_at cookie."""
    try:
        from linkedin_api import Linkedin

        api = None
        profile_name = None

        if request.li_at_cookie:
            # Cookie-based auth (for 2FA users)
            api = await asyncio.to_thread(
                Linkedin, "", "", cookies={"li_at": request.li_at_cookie}
            )
        elif request.email and request.password:
            # Login/password auth
            api = await asyncio.to_thread(
                Linkedin, request.email, request.password
            )
        else:
            return LinkedInAuthResponse(
                success=False,
                error="Provide email+password or li_at cookie"
            )

        # Get profile name to verify auth worked
        try:
            profile = await asyncio.to_thread(api.get_user_profile)
            first = profile.get("firstName", "")
            last = profile.get("lastName", "")
            profile_name = f"{first} {last}".strip() or request.email or "LinkedIn User"
        except Exception:
            profile_name = request.email or "LinkedIn User"

        # Cache session
        session_id = str(uuid.uuid4())
        _cleanup_sessions()
        _sessions[session_id] = (api, datetime.utcnow())

        return LinkedInAuthResponse(
            success=True,
            profile_name=profile_name,
            session_id=session_id,
        )

    except Exception as e:
        error_msg = str(e)
        if "CHALLENGE" in error_msg.upper() or "challenge" in error_msg:
            error_msg = "LinkedIn wymaga weryfikacji (2FA/CAPTCHA). Uzyj cookie li_at zamiast loginu."
        elif "BAD_EMAIL" in error_msg.upper() or "credentials" in error_msg.lower():
            error_msg = "Nieprawidlowy email lub haslo LinkedIn."
        elif "INVALID" in error_msg.upper() and "COOKIE" in error_msg.upper():
            error_msg = "Nieprawidlowe lub wygasle cookie li_at."

        return LinkedInAuthResponse(success=False, error=error_msg)


@router.post("/posts", response_model=LinkedInFetchResponse)
async def linkedin_fetch_posts(request: LinkedInFetchRequest):
    """Fetch posts from LinkedIn feed."""
    try:
        api = _get_session(request.session_id)

        # Human-like delay before fetching
        await asyncio.sleep(random.uniform(1.0, 3.0))

        # Fetch feed posts
        raw_posts = await asyncio.to_thread(
            api.get_feed_posts, limit=request.max_posts
        )

        posts = []
        for post_data in raw_posts:
            try:
                post = _parse_feed_post(post_data, request)
                if post:
                    posts.append(post)
            except Exception:
                continue

            # Human-like delay between processing
            if len(posts) % 10 == 0 and len(posts) > 0:
                await asyncio.sleep(random.uniform(0.5, 1.5))

        return LinkedInFetchResponse(
            success=True,
            posts=posts,
            fetched_count=len(posts),
        )

    except HTTPException:
        raise
    except Exception as e:
        return LinkedInFetchResponse(success=False, error=str(e))


@router.post("/test", response_model=LinkedInTestResponse)
async def linkedin_test(request: LinkedInTestRequest):
    """Test LinkedIn connection."""
    try:
        api = _get_session(request.session_id)

        profile = await asyncio.to_thread(api.get_user_profile)
        first = profile.get("firstName", "")
        last = profile.get("lastName", "")
        profile_name = f"{first} {last}".strip() or "LinkedIn User"

        return LinkedInTestResponse(success=True, profile_name=profile_name)

    except HTTPException:
        raise
    except Exception as e:
        return LinkedInTestResponse(success=False, error=str(e))


@router.post("/disconnect", response_model=LinkedInDisconnectResponse)
async def linkedin_disconnect(request: LinkedInDisconnectRequest):
    """Remove LinkedIn session from cache."""
    _sessions.pop(request.session_id, None)
    return LinkedInDisconnectResponse(success=True)


# =============================================================================
# Helpers
# =============================================================================

def _parse_feed_post(post_data: dict, request: LinkedInFetchRequest) -> Optional[LinkedInPost]:
    """Parse a raw LinkedIn feed post into our model."""

    # Extract from various possible structures
    # linkedin-api returns different structures depending on version
    actor = post_data.get("actor", {})
    author_name = (
        actor.get("name", {}).get("text", "")
        or actor.get("description", {}).get("text", "")
        or "Unknown"
    )

    commentary = post_data.get("commentary", {})
    content_text = commentary.get("text", "") if isinstance(commentary, dict) else str(commentary or "")

    # Also check for 'content' or 'text' at top level
    if not content_text:
        content_text = post_data.get("text", "") or post_data.get("content", "")
        if isinstance(content_text, dict):
            content_text = content_text.get("text", "")

    if not content_text or len(content_text.strip()) < 10:
        return None

    # Check repost
    is_repost = bool(post_data.get("resharedPost") or post_data.get("socialDetail", {}).get("reshared"))
    if is_repost and not request.include_reposts:
        return None

    # Hashtag filtering
    if request.hashtags:
        content_lower = content_text.lower()
        has_hashtag = any(
            f"#{tag.lower().lstrip('#')}" in content_lower
            for tag in request.hashtags
        )
        if not has_hashtag:
            return None

    # Generate external ID from content hash
    urn = post_data.get("urn", "") or post_data.get("updateUrn", "") or post_data.get("dashEntityUrn", "")
    if urn:
        external_id = urn.split(":")[-1] if ":" in urn else urn
    else:
        external_id = hashlib.md5(content_text[:200].encode()).hexdigest()[:16]

    # Title: first line or first 80 chars
    lines = content_text.strip().split("\n")
    title = lines[0][:120] if lines else content_text[:120]

    # URL
    url = f"https://www.linkedin.com/feed/update/urn:li:activity:{external_id}"

    # Published date
    published_at = None
    created_at = post_data.get("createdAt") or post_data.get("publishedAt")
    if created_at:
        try:
            if isinstance(created_at, (int, float)):
                # Millisecond timestamp
                published_at = datetime.fromtimestamp(created_at / 1000).isoformat()
            else:
                published_at = str(created_at)
        except Exception:
            pass

    return LinkedInPost(
        external_id=external_id,
        title=title,
        content=content_text,
        url=url,
        author=author_name,
        published_at=published_at,
    )
