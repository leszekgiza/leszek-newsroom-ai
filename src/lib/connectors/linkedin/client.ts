/**
 * LinkedIn HTTP client - wrapper for Python microservice endpoints.
 */

const TIMEOUT_MS = 30000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3000;

function getBaseUrl(): string {
  return process.env.SCRAPER_URL || "http://localhost:8000";
}

async function fetchWithRetry(
  url: string,
  body: unknown,
  retries = MAX_RETRIES
): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return res;
    } catch (error) {
      if (attempt === retries) throw error;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
  throw new Error("Max retries exceeded");
}

// === Auth ===

export interface LinkedInAuthResult {
  success: boolean;
  profileName?: string;
  sessionId?: string;
  error?: string;
}

export async function linkedInAuth(
  email?: string,
  password?: string,
  liAtCookie?: string
): Promise<LinkedInAuthResult> {
  const res = await fetchWithRetry(`${getBaseUrl()}/linkedin/auth`, {
    email,
    password,
    li_at_cookie: liAtCookie,
  });

  const data = await res.json();
  return {
    success: data.success,
    profileName: data.profile_name,
    sessionId: data.session_id,
    error: data.error,
  };
}

// === Fetch Posts ===

export interface LinkedInPostItem {
  externalId: string;
  title: string;
  content: string;
  url: string;
  author?: string;
  publishedAt?: string;
}

export interface LinkedInFetchResult {
  success: boolean;
  posts: LinkedInPostItem[];
  fetchedCount: number;
  error?: string;
}

export async function linkedInFetchPosts(
  sessionId: string,
  config: {
    maxPosts?: number;
    hashtags?: string[];
    includeReposts?: boolean;
  } = {}
): Promise<LinkedInFetchResult> {
  const res = await fetchWithRetry(`${getBaseUrl()}/linkedin/posts`, {
    session_id: sessionId,
    max_posts: config.maxPosts ?? 30,
    hashtags: config.hashtags,
    include_reposts: config.includeReposts ?? false,
  });

  const data = await res.json();
  return {
    success: data.success,
    posts: (data.posts || []).map((p: Record<string, unknown>) => ({
      externalId: p.external_id,
      title: p.title,
      content: p.content,
      url: p.url,
      author: p.author,
      publishedAt: p.published_at,
    })),
    fetchedCount: data.fetched_count || 0,
    error: data.error,
  };
}

// === Test ===

export interface LinkedInTestResult {
  success: boolean;
  profileName?: string;
  error?: string;
}

export async function linkedInTest(
  sessionId: string
): Promise<LinkedInTestResult> {
  const res = await fetchWithRetry(`${getBaseUrl()}/linkedin/test`, {
    session_id: sessionId,
  });

  const data = await res.json();
  return {
    success: data.success,
    profileName: data.profile_name,
    error: data.error,
  };
}

// === Disconnect ===

export async function linkedInDisconnect(sessionId: string): Promise<void> {
  await fetchWithRetry(`${getBaseUrl()}/linkedin/disconnect`, {
    session_id: sessionId,
  });
}
