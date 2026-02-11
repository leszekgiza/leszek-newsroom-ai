"""
X/Twitter Connector Service
FastAPI router for X/Twitter integration via Twikit (async scraper).
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
# Session Cache (in-memory, TTL 90min, max 100 sessions)
# =============================================================================

SESSION_TTL_MINUTES = 90
MAX_SESSIONS = 100

# session_id -> (Client instance, created_at)
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

    if len(_sessions) > MAX_SESSIONS:
        sorted_sessions = sorted(_sessions.items(), key=lambda x: x[1][1])
        for sid, _ in sorted_sessions[:len(_sessions) - MAX_SESSIONS]:
            _sessions.pop(sid, None)


def _get_session(session_id: str):
    """Get Twitter session by ID, or raise 404."""
    _cleanup_sessions()
    entry = _sessions.get(session_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Session not found or expired")
    client, created = entry
    if datetime.utcnow() - created > timedelta(minutes=SESSION_TTL_MINUTES):
        _sessions.pop(session_id, None)
        raise HTTPException(status_code=410, detail="Session expired")
    return client


# =============================================================================
# Pydantic Models
# =============================================================================

class TwitterAuthRequest(BaseModel):
    auth_token: Optional[str] = None
    ct0: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None


class TwitterAuthResponse(BaseModel):
    success: bool
    username: Optional[str] = None
    session_id: Optional[str] = None
    error: Optional[str] = None


class TwitterFetchRequest(BaseModel):
    session_id: str
    timeline_type: str = "following"  # "following" or "for_you"
    max_tweets: int = 50
    include_retweets: bool = True
    include_replies: bool = False
    expand_threads: bool = True


class Tweet(BaseModel):
    external_id: str
    title: str
    content: str
    url: str
    author: Optional[str] = None
    published_at: Optional[str] = None


class TwitterFetchResponse(BaseModel):
    success: bool
    tweets: list[Tweet] = []
    fetched_count: int = 0
    error: Optional[str] = None


class TwitterTestRequest(BaseModel):
    session_id: str


class TwitterTestResponse(BaseModel):
    success: bool
    username: Optional[str] = None
    error: Optional[str] = None


class TwitterDisconnectRequest(BaseModel):
    session_id: str


class TwitterDisconnectResponse(BaseModel):
    success: bool


# =============================================================================
# Endpoints
# =============================================================================

@router.post("/auth", response_model=TwitterAuthResponse)
async def twitter_auth(request: TwitterAuthRequest):
    """Authenticate with X/Twitter via cookies or login/password."""
    try:
        from twikit import Client

        client = Client("en-US")

        if request.auth_token and request.ct0:
            # Cookie-based auth (preferred)
            client.set_cookies({
                "auth_token": request.auth_token,
                "ct0": request.ct0,
            })
        elif request.username and request.password:
            # Login/password auth (less stable)
            await client.login(
                auth_info_1=request.username,
                password=request.password,
            )
        else:
            return TwitterAuthResponse(
                success=False,
                error="Provide auth_token+ct0 cookies or username+password"
            )

        # Verify auth by getting user info
        username = None
        try:
            user = await client.user()
            username = user.screen_name or user.name or request.username
        except Exception:
            username = request.username or "X User"

        # Cache session
        session_id = str(uuid.uuid4())
        _cleanup_sessions()
        _sessions[session_id] = (client, datetime.utcnow())

        return TwitterAuthResponse(
            success=True,
            username=username,
            session_id=session_id,
        )

    except Exception as e:
        error_msg = str(e)
        if "unauthorized" in error_msg.lower() or "401" in error_msg:
            error_msg = "Nieprawidlowe lub wygasle cookies. Sprawdz auth_token i ct0."
        elif "locked" in error_msg.lower() or "suspended" in error_msg.lower():
            error_msg = "Konto X/Twitter jest zablokowane lub zawieszone."
        elif "rate" in error_msg.lower() and "limit" in error_msg.lower():
            error_msg = "Rate limit X/Twitter. Sprobuj ponownie za 15 minut."

        return TwitterAuthResponse(success=False, error=error_msg)


@router.post("/timeline", response_model=TwitterFetchResponse)
async def twitter_fetch_timeline(request: TwitterFetchRequest):
    """Fetch tweets from X/Twitter timeline."""
    try:
        client = _get_session(request.session_id)

        # Human-like delay
        await asyncio.sleep(random.uniform(1.0, 3.0))

        # Fetch timeline
        if request.timeline_type == "for_you":
            raw_tweets = await client.get_timeline(count=request.max_tweets)
        else:
            raw_tweets = await client.get_latest_timeline(count=request.max_tweets)

        tweets = []
        for tweet_data in raw_tweets:
            try:
                tweet = _parse_tweet(tweet_data, request)
                if tweet:
                    tweets.append(tweet)
            except Exception:
                continue

            # Rate limit awareness
            if len(tweets) % 20 == 0 and len(tweets) > 0:
                await asyncio.sleep(random.uniform(0.5, 1.5))

        # Thread expansion
        if request.expand_threads and tweets:
            tweets = await _expand_threads(client, tweets, raw_tweets)

        return TwitterFetchResponse(
            success=True,
            tweets=tweets,
            fetched_count=len(tweets),
        )

    except HTTPException:
        raise
    except Exception as e:
        return TwitterFetchResponse(success=False, error=str(e))


@router.post("/test", response_model=TwitterTestResponse)
async def twitter_test(request: TwitterTestRequest):
    """Test X/Twitter connection."""
    try:
        client = _get_session(request.session_id)

        user = await client.user()
        username = user.screen_name or user.name or "X User"

        return TwitterTestResponse(success=True, username=username)

    except HTTPException:
        raise
    except Exception as e:
        return TwitterTestResponse(success=False, error=str(e))


@router.post("/disconnect", response_model=TwitterDisconnectResponse)
async def twitter_disconnect(request: TwitterDisconnectRequest):
    """Remove Twitter session from cache."""
    _sessions.pop(request.session_id, None)
    return TwitterDisconnectResponse(success=True)


# =============================================================================
# Helpers
# =============================================================================

def _parse_tweet(tweet_data, request: TwitterFetchRequest) -> Optional[Tweet]:
    """Parse a raw tweet object into our model."""
    try:
        # twikit Tweet object has attributes
        tweet_id = str(getattr(tweet_data, "id", ""))
        text = getattr(tweet_data, "text", "") or getattr(tweet_data, "full_text", "") or ""
        user = getattr(tweet_data, "user", None)
        author_name = ""
        author_screen = ""

        if user:
            author_name = getattr(user, "name", "") or ""
            author_screen = getattr(user, "screen_name", "") or ""

        if not text or len(text.strip()) < 5:
            return None

        # Filter retweets
        is_retweet = text.startswith("RT @") or bool(getattr(tweet_data, "retweeted_tweet", None))
        if is_retweet and not request.include_retweets:
            return None

        # Filter replies
        is_reply = bool(getattr(tweet_data, "in_reply_to_tweet_id", None))
        if is_reply and not request.include_replies:
            return None

        # Title: first 120 chars
        title = text[:120].split("\n")[0]

        # URL
        url = f"https://x.com/{author_screen}/status/{tweet_id}" if author_screen else f"https://x.com/i/status/{tweet_id}"

        # Published date
        published_at = None
        created_at = getattr(tweet_data, "created_at", None)
        if created_at:
            try:
                published_at = str(created_at)
            except Exception:
                pass

        author_display = f"@{author_screen}" if author_screen else author_name

        return Tweet(
            external_id=tweet_id,
            title=title,
            content=text,
            url=url,
            author=author_display,
            published_at=published_at,
        )
    except Exception:
        return None


async def _expand_threads(client, tweets: list[Tweet], raw_tweets) -> list[Tweet]:
    """Expand thread tweets by combining replies in the same conversation."""
    try:
        # Group tweets by conversation - simple approach: combine sequential tweets from same author
        # that are replies to each other
        thread_map: Dict[str, list[Tweet]] = {}
        standalone = []

        for tweet in tweets:
            # For now, keep all tweets as standalone
            # Thread expansion would require additional API calls per tweet
            standalone.append(tweet)

        return standalone
    except Exception:
        return tweets
