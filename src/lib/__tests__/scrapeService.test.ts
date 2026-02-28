// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We need to re-import the module after changing env vars because SCRAPER_URL
// is captured at module-load time as a const.
async function loadModule() {
  vi.resetModules();
  return import("../scrapeService");
}

// ---------------------------------------------------------------------------
// extractIntro (pure function — no mocks needed)
// ---------------------------------------------------------------------------
describe("extractIntro", () => {
  // We can import once for the pure function tests since it doesn't depend on
  // process.env at call time.
  let extractIntro: (markdown: string) => string;

  beforeEach(async () => {
    const mod = await loadModule();
    extractIntro = mod.extractIntro;
  });

  // --- empty / falsy input ---
  it("returns empty string for empty string", () => {
    expect(extractIntro("")).toBe("");
  });

  it("returns empty string for null-ish input", () => {
    // The function checks `if (!markdown)` so undefined/null coerces to falsy
    expect(extractIntro(null as unknown as string)).toBe("");
    expect(extractIntro(undefined as unknown as string)).toBe("");
  });

  // --- heading removal ---
  it("skips markdown headings and returns the first paragraph", () => {
    const md = `# Main Title

## Subtitle

This is the first meaningful paragraph with enough characters to pass the length filter. It has two sentences.`;
    const result = extractIntro(md);
    expect(result).toContain("This is the first meaningful paragraph");
    expect(result).not.toContain("Main Title");
    expect(result).not.toContain("Subtitle");
  });

  it("returns empty string when content is only headings", () => {
    const md = `# Heading One
## Heading Two
### Heading Three`;
    expect(extractIntro(md)).toBe("");
  });

  // --- markdown link removal (text kept) ---
  it("strips markdown link syntax but keeps the link text", () => {
    const md = `# Title

This paragraph contains a [useful link](https://example.com) and enough text to exceed the fifty character minimum threshold for paragraphs.`;
    const result = extractIntro(md);
    expect(result).toContain("useful link");
    expect(result).not.toContain("https://example.com");
    expect(result).not.toContain("[useful link]");
  });

  // --- image removal ---
  it("removes image markdown completely", () => {
    const md = `# Title

![alt text](https://example.com/img.png)

This is a normal paragraph that should be returned because it has enough characters to pass the minimum length filter.`;
    const result = extractIntro(md);
    expect(result).not.toContain("alt text");
    expect(result).not.toContain("img.png");
    expect(result).toContain("This is a normal paragraph");
  });

  // --- bold / italic removal ---
  it("strips bold markers but keeps text", () => {
    const md = `# Title

This paragraph has **bold text** and __also bold__ in it plus enough characters to be above the fifty character threshold for extraction.`;
    const result = extractIntro(md);
    expect(result).toContain("bold text");
    expect(result).toContain("also bold");
    expect(result).not.toContain("**");
    expect(result).not.toContain("__");
  });

  it("strips italic markers but keeps text", () => {
    const md = `# Title

This paragraph has *italic text* and _also italic_ in it plus enough characters to be above the fifty character threshold for extraction.`;
    const result = extractIntro(md);
    expect(result).toContain("italic text");
    expect(result).toContain("also italic");
    expect(result).not.toContain("*italic");
  });

  // --- short paragraphs filtered (< 50 chars) ---
  it("skips paragraphs shorter than 50 characters", () => {
    const md = `Short para.

This is the real first paragraph that is long enough to exceed fifty characters and should be returned as the intro.`;
    const result = extractIntro(md);
    expect(result).not.toContain("Short para");
    expect(result).toContain("This is the real first paragraph");
  });

  // --- blacklist filtering ---
  it("skips paragraphs containing blacklisted phrases (cookie notice)", () => {
    const md = `# Welcome

We use cookie technology to improve your experience on our site and this paragraph is long enough to exceed fifty characters.

This is the actual content paragraph that should be returned because it does not contain any blacklisted phrases and is long enough.`;
    const result = extractIntro(md);
    expect(result).not.toContain("cookie");
    expect(result).toContain("actual content paragraph");
  });

  it("skips paragraphs with subscribe prompts", () => {
    const md = `# Blog Post

Please subscribe to our newsletter to get the latest updates and never miss a new post from our team members.

The real content starts here with interesting information about the topic that we want to discuss in this article today.`;
    const result = extractIntro(md);
    expect(result).not.toContain("subscribe");
    expect(result).toContain("real content starts here");
  });

  it("skips paragraphs with 'skip to content' navigation text", () => {
    const md = `Skip to content and navigate to the main area of this page which has the primary content you are looking for.

The actual article begins here and discusses an important topic that readers will find valuable and informative today.`;
    const result = extractIntro(md);
    expect(result).not.toContain("Skip to content");
    expect(result).toContain("actual article begins here");
  });

  it("skips paragraphs with Polish blacklisted phrases", () => {
    const md = `# Artykul

Zapisz się do naszego newslettera i bądź na bieżąco z najnowszymi artykułami publikowanymi na naszej stronie.

Treść artykułu zaczyna się tutaj i zawiera wartościowe informacje na temat omawiany w niniejszym tekście dzisiaj.`;
    const result = extractIntro(md);
    expect(result).toContain("Treść artykułu");
  });

  it("blacklist matching is case-insensitive", () => {
    const md = `# News

CLICK HERE to read the full article and learn more about the topic being discussed in this comprehensive overview today.

The actual news content starts here and provides detailed information about the events that took place during the week.`;
    const result = extractIntro(md);
    expect(result).not.toContain("CLICK HERE");
    expect(result).toContain("actual news content");
  });

  // --- sentence extraction ---
  it("returns first 2 sentences from a multi-sentence paragraph", () => {
    const md = `# Article

First sentence of the article that is interesting. Second sentence adds more context. Third sentence should not appear. Fourth one either.`;
    const result = extractIntro(md);
    expect(result).toContain("First sentence of the article that is interesting.");
    expect(result).toContain("Second sentence adds more context.");
    expect(result).not.toContain("Third sentence");
  });

  it("handles sentences ending with exclamation marks", () => {
    const md = `# Title

This is an exciting announcement that we want to share! It changes everything we know about the topic. More details follow here.`;
    const result = extractIntro(md);
    expect(result).toContain("This is an exciting announcement that we want to share!");
    expect(result).toContain("It changes everything we know about the topic.");
    expect(result).not.toContain("More details");
  });

  it("handles sentences ending with question marks", () => {
    const md = `# Title

Did you know that this feature exists and is very useful? It was introduced last year as part of a major update. Nobody expected it to be so popular.`;
    const result = extractIntro(md);
    expect(result).toContain("Did you know that this feature exists and is very useful?");
    expect(result).toContain("It was introduced last year as part of a major update.");
    expect(result).not.toContain("Nobody expected");
  });

  it("returns full paragraph (up to 300 chars) when fewer than 2 sentences", () => {
    const md = `# Title

This is one long sentence without a period that keeps going on and on with enough content`;
    const result = extractIntro(md);
    expect(result).toContain("This is one long sentence without a period");
  });

  it("truncates single-sentence paragraph at 300 characters", () => {
    const longParagraph = "A".repeat(400);
    const md = `# Title

${longParagraph}`;
    const result = extractIntro(md);
    expect(result.length).toBe(300);
  });

  // --- returns empty for edge cases ---
  it("returns empty string when all paragraphs are blacklisted", () => {
    const md = `Please subscribe to our mailing list and never miss another update from our incredible team of writers.

Follow us on social media and share on twitter to spread the word about our amazing content and articles.`;
    const result = extractIntro(md);
    expect(result).toBe("");
  });

  it("returns empty string when all paragraphs are too short", () => {
    const md = `Short.

Also short.

Tiny.`;
    expect(extractIntro(md)).toBe("");
  });

  // --- realistic markdown ---
  it("handles realistic blog post markdown", () => {
    const md = `# How to Build a REST API with Node.js

![Banner](https://example.com/banner.png)

*Posted on January 15, 2024*

Building a REST API is one of the most common tasks for backend developers. In this tutorial, we will walk through the entire process step by step.

## Prerequisites

- Node.js v18+
- Basic JavaScript knowledge

## Getting Started

First, create a new directory...`;
    const result = extractIntro(md);
    expect(result).toContain("Building a REST API is one of the most common tasks");
    expect(result).toContain("In this tutorial, we will walk through the entire process step by step.");
    expect(result).not.toContain("Posted on");
    expect(result).not.toContain("Prerequisites");
  });
});

// ---------------------------------------------------------------------------
// HTTP functions — mock global.fetch
// ---------------------------------------------------------------------------

describe("scrapeUrl", () => {
  let scrapeUrl: typeof import("../scrapeService").scrapeUrl;

  beforeEach(async () => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubEnv("SCRAPER_URL", "http://test-scraper:9000");
    const mod = await loadModule();
    scrapeUrl = mod.scrapeUrl;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("sends POST to /scrape with correct body and returns parsed result", async () => {
    const mockResult = {
      success: true,
      url: "https://example.com",
      title: "Example",
      markdown: "# Hello",
      html_length: 1000,
      links_count: 5,
    };
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify(mockResult), { status: 200 })
    );

    const result = await scrapeUrl("https://example.com");

    expect(global.fetch).toHaveBeenCalledWith(
      "http://test-scraper:9000/scrape",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );

    // Verify body contents
    const callArgs = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse(callArgs[1]!.body as string);
    expect(body.url).toBe("https://example.com");
    expect(body.timeout).toBe(30000); // default timeout

    expect(result).toEqual(mockResult);
  });

  it("passes options (waitFor, timeout) in request body", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: true, url: "u", html_length: 0, links_count: 0 }), { status: 200 })
    );

    await scrapeUrl("https://example.com", { waitFor: ".content", timeout: 60000 });

    const callArgs = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse(callArgs[1]!.body as string);
    expect(body.wait_for).toBe(".content");
    expect(body.timeout).toBe(60000);
  });

  it("returns error result for non-ok HTTP response", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response("", { status: 500, statusText: "Internal Server Error" })
    );

    const result = await scrapeUrl("https://example.com");

    expect(result.success).toBe(false);
    expect(result.url).toBe("https://example.com");
    expect(result.html_length).toBe(0);
    expect(result.links_count).toBe(0);
    expect(result.error).toBe("HTTP 500: Internal Server Error");
  });

  it("returns error result on network failure", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("Connection refused"));

    const result = await scrapeUrl("https://example.com");

    expect(result.success).toBe(false);
    expect(result.url).toBe("https://example.com");
    expect(result.error).toBe("Connection refused");
  });

  it("returns 'Network error' for non-Error thrown values", async () => {
    vi.mocked(global.fetch).mockRejectedValue("some string error");

    const result = await scrapeUrl("https://example.com");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Network error");
  });

  it("uses default SCRAPER_URL when env var is not set", async () => {
    vi.unstubAllEnvs();
    vi.stubEnv("SCRAPER_URL", "");
    // Re-import to pick up the missing env var (falls back to default)
    vi.resetModules();
    const mod = await import("../scrapeService");

    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: true, url: "u", html_length: 0, links_count: 0 }), { status: 200 })
    );

    await mod.scrapeUrl("https://example.com");

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/scrape",
      expect.anything()
    );
  });
});

// ---------------------------------------------------------------------------
// scrapeArticlesList
// ---------------------------------------------------------------------------
describe("scrapeArticlesList", () => {
  let scrapeArticlesList: typeof import("../scrapeService").scrapeArticlesList;

  beforeEach(async () => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubEnv("SCRAPER_URL", "http://test-scraper:9000");
    const mod = await loadModule();
    scrapeArticlesList = mod.scrapeArticlesList;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("sends POST to /scrape/articles with correct body", async () => {
    const mockResult = {
      success: true,
      source_url: "https://blog.example.com",
      articles: [{ url: "https://blog.example.com/post-1", title: "Post 1" }],
    };
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify(mockResult), { status: 200 })
    );

    const result = await scrapeArticlesList("https://blog.example.com", 10);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://test-scraper:9000/scrape/articles",
      expect.objectContaining({ method: "POST" })
    );

    const callArgs = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse(callArgs[1]!.body as string);
    expect(body.url).toBe("https://blog.example.com");
    expect(body.max_articles).toBe(10);

    expect(result).toEqual(mockResult);
  });

  it("uses default maxArticles=20 when not specified", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: true, source_url: "u", articles: [] }), { status: 200 })
    );

    await scrapeArticlesList("https://example.com");

    const callArgs = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse(callArgs[1]!.body as string);
    expect(body.max_articles).toBe(20);
  });

  it("returns error result for non-ok HTTP response", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response("", { status: 503, statusText: "Service Unavailable" })
    );

    const result = await scrapeArticlesList("https://example.com");

    expect(result.success).toBe(false);
    expect(result.source_url).toBe("https://example.com");
    expect(result.articles).toEqual([]);
    expect(result.error).toBe("HTTP 503: Service Unavailable");
  });

  it("returns error result on network failure", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await scrapeArticlesList("https://example.com");

    expect(result.success).toBe(false);
    expect(result.source_url).toBe("https://example.com");
    expect(result.articles).toEqual([]);
    expect(result.error).toBe("ECONNREFUSED");
  });

  it("returns 'Network error' for non-Error thrown values", async () => {
    vi.mocked(global.fetch).mockRejectedValue(42);

    const result = await scrapeArticlesList("https://example.com");

    expect(result.error).toBe("Network error");
  });

  // --- client-side pattern filtering ---
  it("filters articles by includePatterns when config is provided", async () => {
    const mockResult = {
      success: true,
      source_url: "https://blog.example.com",
      articles: [
        { url: "https://blog.example.com/blog/post-1", title: "Blog Post 1" },
        { url: "https://blog.example.com/news/article-1", title: "News 1" },
        { url: "https://blog.example.com/blog/post-2", title: "Blog Post 2" },
      ],
    };
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify(mockResult), { status: 200 })
    );

    const result = await scrapeArticlesList("https://blog.example.com", 20, {
      includePatterns: ["/blog/"],
    });

    expect(result.articles).toHaveLength(2);
    expect(result.articles[0].url).toContain("/blog/");
    expect(result.articles[1].url).toContain("/blog/");
  });

  it("excludes articles matching excludePatterns", async () => {
    const mockResult = {
      success: true,
      source_url: "https://blog.example.com",
      articles: [
        { url: "https://blog.example.com/blog/post-1", title: "Post 1" },
        { url: "https://blog.example.com/blog/author/john", title: "Author Page" },
      ],
    };
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify(mockResult), { status: 200 })
    );

    const result = await scrapeArticlesList("https://blog.example.com", 20, {
      includePatterns: ["/blog/"],
      excludePatterns: ["/author/"],
    });

    expect(result.articles).toHaveLength(1);
    expect(result.articles[0].title).toBe("Post 1");
  });

  it("does not filter when includePatterns is empty or absent", async () => {
    const mockResult = {
      success: true,
      source_url: "https://example.com",
      articles: [
        { url: "https://example.com/a", title: "A" },
        { url: "https://example.com/b", title: "B" },
      ],
    };
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify(mockResult), { status: 200 })
    );

    const result = await scrapeArticlesList("https://example.com", 20, {
      includePatterns: [],
    });

    expect(result.articles).toHaveLength(2);
  });

  it("filters out articles with invalid URLs gracefully", async () => {
    const mockResult = {
      success: true,
      source_url: "https://blog.example.com",
      articles: [
        { url: "not-a-valid-url", title: "Invalid" },
        { url: "https://blog.example.com/blog/post-1", title: "Valid" },
      ],
    };
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(JSON.stringify(mockResult), { status: 200 })
    );

    const result = await scrapeArticlesList("https://blog.example.com", 20, {
      includePatterns: ["/blog/"],
    });

    expect(result.articles).toHaveLength(1);
    expect(result.articles[0].title).toBe("Valid");
  });

  it("sends config in request body when provided", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, source_url: "u", articles: [] }),
        { status: 200 }
      )
    );

    const config = { includePatterns: ["/blog/"], excludePatterns: ["/tag/"] };
    await scrapeArticlesList("https://example.com", 20, config);

    const callArgs = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse(callArgs[1]!.body as string);
    expect(body.config).toEqual(config);
  });

  it("does not send config when it is null", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, source_url: "u", articles: [] }),
        { status: 200 }
      )
    );

    await scrapeArticlesList("https://example.com", 20, null);

    const callArgs = vi.mocked(global.fetch).mock.calls[0];
    const body = JSON.parse(callArgs[1]!.body as string);
    // null config converts to undefined which is omitted from JSON
    expect(body.config).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// checkScraperHealth
// ---------------------------------------------------------------------------
describe("checkScraperHealth", () => {
  let checkScraperHealth: typeof import("../scrapeService").checkScraperHealth;

  beforeEach(async () => {
    vi.stubGlobal("fetch", vi.fn());
    vi.stubEnv("SCRAPER_URL", "http://test-scraper:9000");
    const mod = await loadModule();
    checkScraperHealth = mod.checkScraperHealth;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns true when scraper responds with ok status", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response("OK", { status: 200 })
    );

    const result = await checkScraperHealth();

    expect(result).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "http://test-scraper:9000/health",
      expect.objectContaining({ method: "GET" })
    );
  });

  it("returns false when scraper responds with non-ok status", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response("", { status: 503 })
    );

    const result = await checkScraperHealth();

    expect(result).toBe(false);
  });

  it("returns false on network error", async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error("ECONNREFUSED"));

    const result = await checkScraperHealth();

    expect(result).toBe(false);
  });

  it("sends request with abort signal (timeout)", async () => {
    vi.mocked(global.fetch).mockResolvedValue(
      new Response("OK", { status: 200 })
    );

    await checkScraperHealth();

    const callArgs = vi.mocked(global.fetch).mock.calls[0];
    expect(callArgs[1]!.signal).toBeDefined();
  });
});
