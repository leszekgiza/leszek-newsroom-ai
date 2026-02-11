/**
 * X/Twitter HTTP client - wrapper for Python microservice endpoints.
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

export interface TwitterAuthResult {
  success: boolean;
  username?: string;
  sessionId?: string;
  error?: string;
}

export async function twitterAuth(
  authToken?: string,
  ct0?: string,
  username?: string,
  password?: string
): Promise<TwitterAuthResult> {
  const res = await fetchWithRetry(`${getBaseUrl()}/twitter/auth`, {
    auth_token: authToken,
    ct0,
    username,
    password,
  });

  const data = await res.json();
  return {
    success: data.success,
    username: data.username,
    sessionId: data.session_id,
    error: data.error,
  };
}

// === Fetch Timeline ===

export interface TweetItem {
  externalId: string;
  title: string;
  content: string;
  url: string;
  author?: string;
  publishedAt?: string;
}

export interface TwitterFetchResult {
  success: boolean;
  tweets: TweetItem[];
  fetchedCount: number;
  error?: string;
}

export async function twitterFetchTimeline(
  sessionId: string,
  config: {
    timelineType?: string;
    maxTweets?: number;
    includeRetweets?: boolean;
    includeReplies?: boolean;
    expandThreads?: boolean;
  } = {}
): Promise<TwitterFetchResult> {
  const res = await fetchWithRetry(`${getBaseUrl()}/twitter/timeline`, {
    session_id: sessionId,
    timeline_type: config.timelineType ?? "following",
    max_tweets: config.maxTweets ?? 50,
    include_retweets: config.includeRetweets ?? true,
    include_replies: config.includeReplies ?? false,
    expand_threads: config.expandThreads ?? true,
  });

  const data = await res.json();
  return {
    success: data.success,
    tweets: (data.tweets || []).map((t: Record<string, unknown>) => ({
      externalId: t.external_id,
      title: t.title,
      content: t.content,
      url: t.url,
      author: t.author,
      publishedAt: t.published_at,
    })),
    fetchedCount: data.fetched_count || 0,
    error: data.error,
  };
}

// === Test ===

export interface TwitterTestResult {
  success: boolean;
  username?: string;
  error?: string;
}

export async function twitterTest(
  sessionId: string
): Promise<TwitterTestResult> {
  const res = await fetchWithRetry(`${getBaseUrl()}/twitter/test`, {
    session_id: sessionId,
  });

  const data = await res.json();
  return {
    success: data.success,
    username: data.username,
    error: data.error,
  };
}

// === Disconnect ===

export async function twitterDisconnect(sessionId: string): Promise<void> {
  await fetchWithRetry(`${getBaseUrl()}/twitter/disconnect`, {
    session_id: sessionId,
  });
}
