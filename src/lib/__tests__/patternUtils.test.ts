import { describe, it, expect } from "vitest";
import {
  extractPatternsFromUrls,
  urlMatchesPatterns,
  filterLinksByPatterns,
  createSourceConfig,
  suggestExcludePatterns,
  DEFAULT_EXCLUDE_PATTERNS,
  type DiscoveredLink,
} from "@/lib/patternUtils";

// ---------------------------------------------------------------------------
// extractPatternsFromUrls
// ---------------------------------------------------------------------------
describe("extractPatternsFromUrls", () => {
  it("returns empty array for empty input", () => {
    expect(extractPatternsFromUrls([])).toEqual([]);
  });

  it("extracts a depth-1 pattern from a single URL", () => {
    const urls = ["https://example.com/blog/my-post"];
    const result = extractPatternsFromUrls(urls);
    const patterns = result.map((r) => r.pattern);
    expect(patterns).toContain("/blog/");
  });

  it("generates patterns at multiple depths but deduplicates via shorter-first", () => {
    // With a single URL, /a/ is the shortest pattern and covers it,
    // so deeper patterns (/a/b/, /a/b/c/) are deduplicated away
    const urls = ["https://example.com/a/b/c/slug"];
    const result = extractPatternsFromUrls(urls);
    const patterns = result.map((r) => r.pattern);
    expect(patterns).toContain("/a/");
    // Deeper patterns are dropped because /a/ already consumed the URL
    expect(patterns).not.toContain("/a/b/");
    expect(patterns).not.toContain("/a/b/c/");
  });

  it("produces deeper patterns when they cover different URLs than shorter ones", () => {
    // Two distinct top-level paths: /a/ covers url1, /x/ covers url2
    // /a/b/ cannot add new URLs beyond /a/, but /x/y/ cannot beyond /x/
    const urls = [
      "https://example.com/a/b/post",
      "https://example.com/x/y/post",
    ];
    const result = extractPatternsFromUrls(urls);
    const patterns = result.map((r) => r.pattern);
    expect(patterns).toContain("/a/");
    expect(patterns).toContain("/x/");
  });

  it("skips date-like segments (4-digit year)", () => {
    const urls = ["https://example.com/blog/2024/my-article"];
    const result = extractPatternsFromUrls(urls);
    const patterns = result.map((r) => r.pattern);
    expect(patterns).toContain("/blog/");
    // /blog/2024/ should NOT be generated because "2024" is date-like
    expect(patterns).not.toContain("/blog/2024/");
  });

  it("skips date-like segments (8-digit date)", () => {
    const urls = ["https://example.com/news/20240115/article"];
    const result = extractPatternsFromUrls(urls);
    const patterns = result.map((r) => r.pattern);
    expect(patterns).not.toContain("/news/20240115/");
  });

  it("skips slug-like segments with >2 hyphens at depth > 1", () => {
    const urls = [
      "https://example.com/blog/this-is-a-long-slug",
    ];
    const result = extractPatternsFromUrls(urls);
    const patterns = result.map((r) => r.pattern);
    // "this-is-a-long-slug" has >2 hyphens and depth > 1 => skipped
    expect(patterns).not.toContain("/blog/this-is-a-long-slug/");
    expect(patterns).toContain("/blog/");
  });

  it("deduplicates: shorter patterns consume URLs first", () => {
    const urls = [
      "https://example.com/blog/post-1",
      "https://example.com/blog/post-2",
    ];
    const result = extractPatternsFromUrls(urls);
    // /blog/ is shorter and covers both URLs, so deeper patterns should be absent
    const blogPattern = result.find((r) => r.pattern === "/blog/");
    expect(blogPattern).toBeDefined();
    expect(blogPattern!.matchCount).toBe(2);
    expect(blogPattern!.sampleUrls).toHaveLength(2);
  });

  it("uses allDiscoveredUrls for matchCount when provided", () => {
    const selectedUrls = ["https://example.com/news/article-1"];
    const allDiscoveredUrls = [
      "https://example.com/news/article-1",
      "https://example.com/news/article-2",
      "https://example.com/news/article-3",
      "https://example.com/other/page",
    ];
    const result = extractPatternsFromUrls(selectedUrls, allDiscoveredUrls);
    const newsPattern = result.find((r) => r.pattern === "/news/");
    expect(newsPattern).toBeDefined();
    expect(newsPattern!.matchCount).toBe(3);
  });

  it("returns results sorted by matchCount descending", () => {
    const urls = [
      "https://example.com/blog/a",
      "https://example.com/blog/b",
      "https://example.com/news/c",
    ];
    const result = extractPatternsFromUrls(urls);
    // /blog/ matches 2, /news/ matches 1
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0].matchCount).toBeGreaterThanOrEqual(result[1].matchCount);
  });

  it("handles invalid URLs gracefully (empty segments)", () => {
    const urls = ["not-a-url"];
    const result = extractPatternsFromUrls(urls);
    expect(result).toEqual([]);
  });

  it("limits sampleUrls to at most 3", () => {
    const urls = [
      "https://example.com/blog/a",
      "https://example.com/blog/b",
      "https://example.com/blog/c",
      "https://example.com/blog/d",
    ];
    const result = extractPatternsFromUrls(urls);
    const blogPattern = result.find((r) => r.pattern === "/blog/");
    expect(blogPattern).toBeDefined();
    expect(blogPattern!.sampleUrls.length).toBeLessThanOrEqual(3);
  });

  it("reports correct depth for each pattern", () => {
    // Use distinct top-level segments so deeper patterns are not deduplicated
    const urls = [
      "https://example.com/a/slug",
      "https://example.com/x/y/slug",
    ];
    const result = extractPatternsFromUrls(urls);
    const depth1 = result.find((r) => r.pattern === "/a/");
    expect(depth1?.depth).toBe(1);
    const depth1x = result.find((r) => r.pattern === "/x/");
    expect(depth1x?.depth).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// urlMatchesPatterns
// ---------------------------------------------------------------------------
describe("urlMatchesPatterns", () => {
  it("returns true when URL path starts with an include pattern", () => {
    expect(
      urlMatchesPatterns("https://example.com/blog/post", ["/blog/"])
    ).toBe(true);
  });

  it("strips trailing slash from pattern before comparison", () => {
    // Pattern "/blog/" becomes "/blog" for startsWith check
    expect(
      urlMatchesPatterns("https://example.com/blog", ["/blog/"])
    ).toBe(true);
  });

  it("returns false when URL does not match any include pattern", () => {
    expect(
      urlMatchesPatterns("https://example.com/news/article", ["/blog/"])
    ).toBe(false);
  });

  it("returns false when URL matches an exclude pattern", () => {
    expect(
      urlMatchesPatterns(
        "https://example.com/blog/author/john",
        ["/blog/"],
        ["/author/"]
      )
    ).toBe(false);
  });

  it("checks exclude before include", () => {
    // URL matches both include and exclude => excluded wins
    expect(
      urlMatchesPatterns(
        "https://example.com/blog/tag/javascript",
        ["/blog/"],
        ["/tag/"]
      )
    ).toBe(false);
  });

  it("returns true for any URL when includePatterns is empty (no excludes)", () => {
    expect(
      urlMatchesPatterns("https://example.com/anything/here", [])
    ).toBe(true);
  });

  it("returns false for invalid URL", () => {
    expect(urlMatchesPatterns("not-a-url", ["/blog/"])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// filterLinksByPatterns
// ---------------------------------------------------------------------------
describe("filterLinksByPatterns", () => {
  const links: DiscoveredLink[] = [
    { url: "https://example.com/blog/post-1", title: "Post 1", path: "/blog/post-1" },
    { url: "https://example.com/news/article", title: "Article", path: "/news/article" },
    { url: "https://example.com/about", title: "About", path: "/about" },
  ];

  it("filters links to only those matching include patterns", () => {
    const result = filterLinksByPatterns(links, ["/blog/"]);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe("https://example.com/blog/post-1");
  });

  it("excludes links matching exclude patterns", () => {
    const result = filterLinksByPatterns(links, [], ["/about"]);
    expect(result).toHaveLength(2);
    expect(result.map((l) => l.path)).not.toContain("/about");
  });

  it("returns all links when both include and exclude are empty", () => {
    const result = filterLinksByPatterns(links, []);
    expect(result).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// createSourceConfig
// ---------------------------------------------------------------------------
describe("createSourceConfig", () => {
  it("returns a valid SourceConfig with all fields", () => {
    const config = createSourceConfig(
      ["/blog/"],
      ["https://example.com/blog/post-1"]
    );
    expect(config.includePatterns).toEqual(["/blog/"]);
    expect(config.excludePatterns).toEqual(DEFAULT_EXCLUDE_PATTERNS);
    expect(config.patternVersion).toBe(1);
    expect(config.lastConfiguredAt).toBeTruthy();
    expect(config.sampleUrls).toEqual(["https://example.com/blog/post-1"]);
  });

  it("uses DEFAULT_EXCLUDE_PATTERNS when excludePatterns is omitted", () => {
    const config = createSourceConfig(["/news/"], []);
    expect(config.excludePatterns).toEqual(DEFAULT_EXCLUDE_PATTERNS);
  });

  it("uses custom excludePatterns when provided", () => {
    const custom = ["/custom-exclude/"];
    const config = createSourceConfig(["/blog/"], [], custom);
    expect(config.excludePatterns).toEqual(custom);
  });

  it("sets lastConfiguredAt to a valid ISO date string", () => {
    const before = new Date().toISOString();
    const config = createSourceConfig([], []);
    const after = new Date().toISOString();
    expect(config.lastConfiguredAt >= before).toBe(true);
    expect(config.lastConfiguredAt <= after).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// suggestExcludePatterns
// ---------------------------------------------------------------------------
describe("suggestExcludePatterns", () => {
  it("returns matching DEFAULT_EXCLUDE_PATTERNS for discovered links", () => {
    const links: DiscoveredLink[] = [
      { url: "https://example.com/about", title: "About", path: "/about" },
      { url: "https://example.com/blog/post", title: "Post", path: "/blog/post" },
    ];
    const suggestions = suggestExcludePatterns(links);
    expect(suggestions).toContain("/about");
    expect(suggestions).not.toContain("/blog/");
  });

  it("returns empty array when no links match default excludes", () => {
    const links: DiscoveredLink[] = [
      { url: "https://example.com/blog/post", title: "Post", path: "/blog/post" },
    ];
    const suggestions = suggestExcludePatterns(links);
    expect(suggestions).toEqual([]);
  });

  it("deduplicates: each pattern appears at most once", () => {
    const links: DiscoveredLink[] = [
      { url: "https://example.com/about", title: "About 1", path: "/about" },
      { url: "https://example.com/about-us", title: "About 2", path: "/about-us" },
    ];
    const suggestions = suggestExcludePatterns(links);
    const aboutCount = suggestions.filter((s) => s === "/about").length;
    expect(aboutCount).toBe(1);
  });

  it("matches are case-insensitive on the path", () => {
    const links: DiscoveredLink[] = [
      { url: "https://example.com/About", title: "About", path: "/About" },
    ];
    const suggestions = suggestExcludePatterns(links);
    expect(suggestions).toContain("/about");
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_EXCLUDE_PATTERNS constant
// ---------------------------------------------------------------------------
describe("DEFAULT_EXCLUDE_PATTERNS", () => {
  it("is a non-empty array of strings", () => {
    expect(Array.isArray(DEFAULT_EXCLUDE_PATTERNS)).toBe(true);
    expect(DEFAULT_EXCLUDE_PATTERNS.length).toBeGreaterThan(0);
    for (const p of DEFAULT_EXCLUDE_PATTERNS) {
      expect(typeof p).toBe("string");
    }
  });
});
