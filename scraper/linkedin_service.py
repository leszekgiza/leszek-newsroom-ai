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
    jsessionid: Optional[str] = None


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


class LinkedInProfileInfo(BaseModel):
    public_id: str
    name: str
    headline: Optional[str] = None
    profile_url: str
    photo_url: Optional[str] = None


class SearchProfilesRequest(BaseModel):
    session_id: str
    keywords: str
    limit: int = 10


class SearchProfilesResponse(BaseModel):
    success: bool
    profiles: list[LinkedInProfileInfo] = []
    error: Optional[str] = None


class ProfilePostsRequest(BaseModel):
    session_id: str
    public_id: str
    max_posts: int = 10


class ProfilePostsResponse(BaseModel):
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
            # linkedin-api 2.3+ requires RequestsCookieJar, not dict
            import requests.cookies
            cookie_jar = requests.cookies.RequestsCookieJar()
            cookie_jar.set("li_at", request.li_at_cookie, domain=".linkedin.com", path="/")
            if request.jsessionid:
                cookie_jar.set("JSESSIONID", request.jsessionid, domain=".linkedin.com", path="/")
            api = await asyncio.to_thread(
                Linkedin, "", "", cookies=cookie_jar
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


@router.post("/search-profiles", response_model=SearchProfilesResponse)
async def linkedin_search_profiles(request: SearchProfilesRequest):
    """Search for LinkedIn profiles by keywords."""
    try:
        api = _get_session(request.session_id)

        await asyncio.sleep(random.uniform(1.0, 3.0))

        raw_results = await asyncio.to_thread(
            api.search_people, keywords=request.keywords, limit=request.limit
        )

        profiles = []
        for person in raw_results or []:
            try:
                public_id = person.get("public_id", "")
                if not public_id:
                    continue
                first = person.get("name", "")
                # search_people returns 'name' as full name
                name = first if first else "Unknown"
                headline = person.get("jobtitle", "") or person.get("headline", "")
                profile_url = f"https://www.linkedin.com/in/{public_id}"
                photo_url = person.get("profile_picture", None)

                profiles.append(LinkedInProfileInfo(
                    public_id=public_id,
                    name=name,
                    headline=headline or None,
                    profile_url=profile_url,
                    photo_url=photo_url,
                ))
            except Exception:
                continue

        return SearchProfilesResponse(success=True, profiles=profiles)

    except HTTPException:
        raise
    except Exception as e:
        return SearchProfilesResponse(success=False, error=str(e))


@router.post("/profile-posts", response_model=ProfilePostsResponse)
async def linkedin_profile_posts(request: ProfilePostsRequest):
    """Fetch posts from a specific LinkedIn profile."""
    try:
        api = _get_session(request.session_id)

        await asyncio.sleep(random.uniform(2.0, 5.0))

        print(f"[LINKEDIN] Fetching profile posts for: {request.public_id}, max_posts={request.max_posts}")

        try:
            raw_posts = await asyncio.to_thread(
                _fetch_profile_posts, api, request.public_id, request.max_posts
            )
        except Exception as fetch_err:
            print(f"[LINKEDIN] fetch_profile_posts failed: {type(fetch_err).__name__}: {fetch_err}")
            raise

        print(f"[LINKEDIN] Raw posts returned: {len(raw_posts) if raw_posts else 0}")

        posts = []
        for i, post_data in enumerate(raw_posts or []):
            try:
                post = _parse_post(post_data, author_name=None)
                if post:
                    posts.append(post)
                else:
                    print(f"[LINKEDIN] Post {i} parsed to None (content too short or missing)")
            except Exception as parse_err:
                print(f"[LINKEDIN] Post {i} parse error: {parse_err}")
                continue

        return ProfilePostsResponse(
            success=True,
            posts=posts,
            fetched_count=len(posts),
        )

    except HTTPException:
        raise
    except Exception as e:
        return ProfilePostsResponse(success=False, error=str(e))


@router.post("/disconnect", response_model=LinkedInDisconnectResponse)
async def linkedin_disconnect(request: LinkedInDisconnectRequest):
    """Remove LinkedIn session from cache."""
    _sessions.pop(request.session_id, None)
    return LinkedInDisconnectResponse(success=True)


# =============================================================================
# Helpers
# =============================================================================

def _fetch_profile_posts(api, public_id: str, max_posts: int) -> list:
    """
    Fetch posts for a LinkedIn profile by public_id.
    Uses get_profile to resolve the real URN, then queries profileUpdatesV2.
    This avoids the KeyError bug in linkedin-api's get_profile_posts.
    """
    import json as _json

    # Step 1: Resolve public_id -> profile URN via get_profile
    # We call the raw API to avoid the buggy get_profile error handling
    res = api._fetch(
        f"/identity/dash/profiles?q=memberIdentity&memberIdentity={public_id}"
        f"&decorationId=com.linkedin.voyager.dash.deco.identity.profile.WebTopCardCore-19"
    )
    profile_data = res.json()

    if not isinstance(profile_data, dict) or "elements" not in profile_data:
        print(f"[LINKEDIN] Profile lookup failed for {public_id}: {_json.dumps(profile_data)[:300]}")
        return []

    elements = profile_data.get("elements", [])
    if not elements:
        print(f"[LINKEDIN] No profile elements for {public_id}")
        return []

    # Extract entityUrn from profile (format: urn:li:fsd_profile:ACoAAxxxxxxx)
    profile_urn = elements[0].get("entityUrn", "") or elements[0].get("objectUrn", "")
    if not profile_urn:
        # Fallback: try to find any URN-like field
        for key in ["publicIdentifier", "*profile", "dashEntityUrn"]:
            if key in elements[0]:
                profile_urn = elements[0][key]
                break

    print(f"[LINKEDIN] Resolved {public_id} -> URN: {profile_urn}")

    if not profile_urn or "fsd_profile" not in profile_urn:
        # Try constructing from objectUrn
        object_urn = elements[0].get("objectUrn", "")
        if object_urn:
            # objectUrn is like urn:li:member:123456 -> convert to fsd_profile
            member_id = object_urn.split(":")[-1]
            profile_urn = f"urn:li:fsd_profile:{member_id}"
            print(f"[LINKEDIN] Constructed fsd_profile URN from objectUrn: {profile_urn}")
        else:
            print(f"[LINKEDIN] Cannot resolve URN for {public_id}")
            return []

    # Step 2: Fetch posts using the resolved URN
    url_params = {
        "count": min(max_posts, 100),
        "start": 0,
        "q": "memberShareFeed",
        "moduleKey": "member-shares:phone",
        "includeLongTermHistory": True,
        "profileUrn": profile_urn,
    }

    res2 = api._fetch("/identity/profileUpdatesV2", params=url_params)
    data2 = res2.json()

    print(f"[LINKEDIN] Posts API status={res2.status_code}, keys={list(data2.keys()) if isinstance(data2, dict) else type(data2)}")

    if isinstance(data2, dict) and "elements" in data2:
        posts = data2["elements"]
        print(f"[LINKEDIN] Got {len(posts)} post elements for {public_id}")
        return posts

    if isinstance(data2, dict) and "status" in data2:
        print(f"[LINKEDIN] Posts API error: status={data2.get('status')}, msg={data2.get('message', 'N/A')}")

    return []


def _extract_activity_id(post_data: dict) -> str:
    """Extract clean LinkedIn activity ID from post data URNs."""
    import re

    # Try multiple URN sources
    for key in ["dashEntityUrn", "entityUrn", "urn", "updateUrn"]:
        urn = post_data.get(key, "")
        if not urn:
            continue
        # Match activity ID pattern: a long numeric ID (typically 19-20 digits)
        match = re.search(r"urn:li:(?:activity|ugcPost):(\d{15,25})", str(urn))
        if match:
            return match.group(1)

    # Fallback: check socialDetail for URN
    social_detail = post_data.get("socialDetail", {})
    if isinstance(social_detail, dict):
        for key in ["urn", "entityUrn", "dashEntityUrn"]:
            urn = social_detail.get(key, "")
            match = re.search(r"urn:li:(?:activity|ugcPost):(\d{15,25})", str(urn))
            if match:
                return match.group(1)

    return ""


def _extract_published_at(post_data: dict) -> Optional[str]:
    """Extract published timestamp from LinkedIn post data. Checks multiple locations."""
    # Direct timestamp fields
    for key in ["createdAt", "publishedAt", "created_at", "published_at"]:
        ts = post_data.get(key)
        if ts:
            try:
                if isinstance(ts, (int, float)):
                    return datetime.fromtimestamp(ts / 1000).isoformat()
                return str(ts)
            except Exception:
                continue

    # Check inside updateMetadata
    update_meta = post_data.get("updateMetadata", {})
    if isinstance(update_meta, dict):
        for key in ["updateCreatedTime", "createdAt", "publishedAt"]:
            ts = update_meta.get(key)
            if ts and isinstance(ts, (int, float)):
                try:
                    return datetime.fromtimestamp(ts / 1000).isoformat()
                except Exception:
                    continue

    # Check inside socialDetail
    social = post_data.get("socialDetail", {})
    if isinstance(social, dict):
        for key in ["createdTime", "createdAt"]:
            ts = social.get(key)
            if ts and isinstance(ts, (int, float)):
                try:
                    return datetime.fromtimestamp(ts / 1000).isoformat()
                except Exception:
                    continue

    return None


def _parse_post(post_data: dict, author_name: Optional[str] = None) -> Optional[LinkedInPost]:
    """Parse a raw LinkedIn post into our model. Works for both feed and profile posts."""

    # Extract author from actor if not provided
    if not author_name:
        actor = post_data.get("actor", {})
        if isinstance(actor, dict):
            name_field = actor.get("name", {})
            desc_field = actor.get("description", {})
            author_name = (
                (name_field.get("text", "") if isinstance(name_field, dict) else str(name_field or ""))
                or (desc_field.get("text", "") if isinstance(desc_field, dict) else str(desc_field or ""))
                or "Unknown"
            )
        else:
            author_name = "Unknown"

    commentary = post_data.get("commentary", {})
    if isinstance(commentary, dict):
        text_field = commentary.get("text", "")
        # text can be a nested dict with {"text": "...", "attributes": [...]}
        if isinstance(text_field, dict):
            content_text = text_field.get("text", "")
        else:
            content_text = str(text_field or "")
    else:
        content_text = str(commentary or "")

    # Also check for 'content' or 'text' at top level
    if not content_text:
        content_text = post_data.get("text", "") or post_data.get("content", "")
        if isinstance(content_text, dict):
            content_text = content_text.get("text", "")
        content_text = str(content_text or "")

    if not content_text or len(content_text.strip()) < 10:
        return None

    # Extract clean activity ID
    activity_id = _extract_activity_id(post_data)
    if activity_id:
        external_id = activity_id
    else:
        external_id = hashlib.md5(content_text[:200].encode()).hexdigest()[:16]

    # Title: first line or first 120 chars
    lines = content_text.strip().split("\n")
    title = lines[0][:120] if lines else content_text[:120]

    # Clean URL with just the activity ID
    url = f"https://www.linkedin.com/feed/update/urn:li:activity:{external_id}"

    # Published date
    published_at = _extract_published_at(post_data)

    return LinkedInPost(
        external_id=external_id,
        title=title,
        content=content_text,
        url=url,
        author=author_name,
        published_at=published_at,
    )


def _parse_feed_post(post_data: dict, request: LinkedInFetchRequest) -> Optional[LinkedInPost]:
    """Parse a raw LinkedIn feed post with feed-specific filtering (reposts, hashtags)."""

    # Check repost before full parsing
    is_repost = bool(post_data.get("resharedPost") or post_data.get("socialDetail", {}).get("reshared"))
    if is_repost and not request.include_reposts:
        return None

    # Hashtag filtering requires content extraction first
    if request.hashtags:
        commentary = post_data.get("commentary", {})
        content_text = commentary.get("text", "") if isinstance(commentary, dict) else str(commentary or "")
        if not content_text:
            content_text = post_data.get("text", "") or post_data.get("content", "")
            if isinstance(content_text, dict):
                content_text = content_text.get("text", "")
        if content_text:
            content_lower = content_text.lower()
            has_hashtag = any(
                f"#{tag.lower().lstrip('#')}" in content_lower
                for tag in request.hashtags
            )
            if not has_hashtag:
                return None

    return _parse_post(post_data)
