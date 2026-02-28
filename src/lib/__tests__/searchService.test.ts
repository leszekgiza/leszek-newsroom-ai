// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Pool } from "pg";
import { searchArticles } from "../searchService";
import type { SearchOptions, SearchResult } from "../searchService";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockPool() {
  const mockQuery = vi.fn();
  const pool = { query: mockQuery } as unknown as Pool;
  return { pool, mockQuery };
}

function baseOptions(overrides: Partial<SearchOptions> = {}): SearchOptions {
  return {
    query: "artificial intelligence",
    subscribedSourceIds: ["src-1", "src-2"],
    privateSourceIds: ["priv-1"],
    dismissedArticleIds: [],
    ...overrides,
  };
}

function makeSampleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "art-1",
    url: "https://example.com/article-1",
    title: "AI in 2026",
    intro: "A brief intro about artificial intelligence",
    summary: "Full summary of the article",
    image_url: "https://example.com/img.jpg",
    author: "Jan Kowalski",
    published_at: new Date("2026-01-15T10:00:00Z"),
    created_at: new Date("2026-01-15T12:00:00Z"),
    catalog_source_id: "src-1",
    private_source_id: null,
    rank: "0.75",
    headline: "<mark>AI</mark> in 2026",
    total_count: "1",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("searchArticles", () => {
  let pool: Pool;
  let mockQuery: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    const mock = createMockPool();
    pool = mock.pool;
    mockQuery = mock.mockQuery;
  });

  // -----------------------------------------------------------------------
  // Empty / short query — early returns
  // -----------------------------------------------------------------------

  it("returns empty results for an empty search query", async () => {
    const result = await searchArticles(pool, baseOptions({ query: "" }));

    expect(result).toEqual({ articles: [], total: 0 });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("returns empty results for a single-character query", async () => {
    const result = await searchArticles(pool, baseOptions({ query: "a" }));

    expect(result).toEqual({ articles: [], total: 0 });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("returns empty results for whitespace-only query", async () => {
    const result = await searchArticles(pool, baseOptions({ query: "   " }));

    expect(result).toEqual({ articles: [], total: 0 });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("returns empty results when sanitized query is too short", async () => {
    // After removing special chars, only "a" remains which is < 2 chars
    const result = await searchArticles(pool, baseOptions({ query: "a!!!" }));

    expect(result).toEqual({ articles: [], total: 0 });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("returns empty results when all words are single characters after split", async () => {
    // After sanitization: "a b c" — each word < 2 chars, so prefixQuery becomes empty
    const result = await searchArticles(
      pool,
      baseOptions({ query: "a b c" })
    );

    expect(result).toEqual({ articles: [], total: 0 });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // No sources to search — early return
  // -----------------------------------------------------------------------

  it("returns empty results when no source IDs are provided", async () => {
    const result = await searchArticles(
      pool,
      baseOptions({
        subscribedSourceIds: [],
        privateSourceIds: [],
      })
    );

    expect(result).toEqual({ articles: [], total: 0 });
    expect(mockQuery).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Query sanitization
  // -----------------------------------------------------------------------

  it("sanitizes special characters from search query", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    await searchArticles(
      pool,
      baseOptions({ query: "hello! @world# $test%" })
    );

    // After sanitization: "hello world test"
    // Prefix query: "hello:* & world:* & test:*"
    const sqlParams = mockQuery.mock.calls[0][1];
    expect(sqlParams[0]).toBe("hello:* & world:* & test:*");
  });

  it("collapses multiple whitespace into single space", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    await searchArticles(
      pool,
      baseOptions({ query: "  hello    world  " })
    );

    const sqlParams = mockQuery.mock.calls[0][1];
    expect(sqlParams[0]).toBe("hello:* & world:*");
  });

  it("handles query with Polish diacritics correctly", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    await searchArticles(
      pool,
      baseOptions({ query: "żółć gęślą jaźń" })
    );

    const sqlParams = mockQuery.mock.calls[0][1];
    expect(sqlParams[0]).toBe("żółć:* & gęślą:* & jaźń:*");
  });

  it("preserves hyphens in query words", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    await searchArticles(
      pool,
      baseOptions({ query: "machine-learning model" })
    );

    const sqlParams = mockQuery.mock.calls[0][1];
    expect(sqlParams[0]).toBe("machine-learning:* & model:*");
  });

  it("creates prefix search format for partial matching", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    await searchArticles(pool, baseOptions({ query: "agent LLM" }));

    const sqlParams = mockQuery.mock.calls[0][1];
    expect(sqlParams[0]).toBe("agent:* & LLM:*");
  });

  it("filters out single-character words from prefix query", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    await searchArticles(
      pool,
      baseOptions({ query: "AI a in technology" })
    );

    // "a" is < 2 chars, "in" is 2 chars (kept), "AI" is 2 chars (kept)
    const sqlParams = mockQuery.mock.calls[0][1];
    expect(sqlParams[0]).toBe("AI:* & in:* & technology:*");
  });

  // -----------------------------------------------------------------------
  // SQL construction — source filters
  // -----------------------------------------------------------------------

  it("includes both catalog and private source conditions in SQL", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    await searchArticles(pool, baseOptions());

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain("a.catalog_source_id = ANY($2::text[])");
    expect(sql).toContain("a.private_source_id = ANY($3::text[])");
  });

  it("only includes catalog source condition when no private sources", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    await searchArticles(
      pool,
      baseOptions({ privateSourceIds: [] })
    );

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain("a.catalog_source_id = ANY($2::text[])");
    expect(sql).not.toContain("a.private_source_id = ANY($3::text[])");
  });

  it("only includes private source condition when no catalog sources", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    await searchArticles(
      pool,
      baseOptions({ subscribedSourceIds: [] })
    );

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).not.toContain("a.catalog_source_id = ANY($2::text[])");
    expect(sql).toContain("a.private_source_id = ANY($3::text[])");
  });

  // -----------------------------------------------------------------------
  // sourceFilter narrows to a single source
  // -----------------------------------------------------------------------

  it("narrows to a single catalog source when sourceFilter matches subscribedSourceIds", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    await searchArticles(
      pool,
      baseOptions({ sourceFilter: "src-1" })
    );

    const sqlParams = mockQuery.mock.calls[0][1];
    // $2 = catalogIds, $3 = privateIds
    expect(sqlParams[1]).toEqual(["src-1"]);
    expect(sqlParams[2]).toEqual([]);

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain("a.catalog_source_id = ANY($2::text[])");
    expect(sql).not.toContain("a.private_source_id = ANY($3::text[])");
  });

  it("narrows to a single private source when sourceFilter matches privateSourceIds", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    await searchArticles(
      pool,
      baseOptions({ sourceFilter: "priv-1" })
    );

    const sqlParams = mockQuery.mock.calls[0][1];
    expect(sqlParams[1]).toEqual([]);
    expect(sqlParams[2]).toEqual(["priv-1"]);

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).not.toContain("a.catalog_source_id = ANY($2::text[])");
    expect(sql).toContain("a.private_source_id = ANY($3::text[])");
  });

  it("falls through to all sources when sourceFilter matches neither catalog nor private", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    await searchArticles(
      pool,
      baseOptions({ sourceFilter: "unknown-source" })
    );

    // When sourceFilter doesn't match any known source, the original
    // subscribedSourceIds and privateSourceIds are used unchanged
    const sqlParams = mockQuery.mock.calls[0][1];
    expect(sqlParams[1]).toEqual(["src-1", "src-2"]); // all catalog sources
    expect(sqlParams[2]).toEqual(["priv-1"]); // all private sources
  });

  // -----------------------------------------------------------------------
  // Dismissed articles filter
  // -----------------------------------------------------------------------

  it("includes dismissed article filter when dismissedArticleIds is non-empty", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    await searchArticles(
      pool,
      baseOptions({ dismissedArticleIds: ["d-1", "d-2"] })
    );

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain("AND a.id != ALL($6::text[])");

    const sqlParams = mockQuery.mock.calls[0][1];
    expect(sqlParams[5]).toEqual(["d-1", "d-2"]);
  });

  it("does not include dismissed filter when dismissedArticleIds is empty", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    await searchArticles(
      pool,
      baseOptions({ dismissedArticleIds: [] })
    );

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).not.toContain("a.id != ALL");
  });

  // -----------------------------------------------------------------------
  // Author filter
  // -----------------------------------------------------------------------

  it("includes author filter when author option is provided", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    await searchArticles(
      pool,
      baseOptions({ author: "Jan Kowalski" })
    );

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain("AND a.author = $6");

    const sqlParams = mockQuery.mock.calls[0][1];
    expect(sqlParams[5]).toBe("Jan Kowalski");
  });

  it("uses correct parameter index for author when dismissed articles are also present", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    await searchArticles(
      pool,
      baseOptions({
        dismissedArticleIds: ["d-1"],
        author: "Jan Kowalski",
      })
    );

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain("AND a.id != ALL($6::text[])");
    expect(sql).toContain("AND a.author = $7");

    const sqlParams = mockQuery.mock.calls[0][1];
    expect(sqlParams[5]).toEqual(["d-1"]);
    expect(sqlParams[6]).toBe("Jan Kowalski");
  });

  it("does not include author filter when author is not provided", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    await searchArticles(pool, baseOptions());

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).not.toContain("a.author =");
  });

  // -----------------------------------------------------------------------
  // Pagination
  // -----------------------------------------------------------------------

  it("passes limit and offset as parameters", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    await searchArticles(
      pool,
      baseOptions({ limit: 20, offset: 40 })
    );

    const sqlParams = mockQuery.mock.calls[0][1];
    // $4 = limit, $5 = offset
    expect(sqlParams[3]).toBe(20);
    expect(sqlParams[4]).toBe(40);
  });

  it("uses default limit=50 and offset=0 when not specified", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    await searchArticles(pool, baseOptions());

    const sqlParams = mockQuery.mock.calls[0][1];
    expect(sqlParams[3]).toBe(50);
    expect(sqlParams[4]).toBe(0);
  });

  it("includes LIMIT and OFFSET placeholders in SQL", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    await searchArticles(pool, baseOptions());

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain("LIMIT $4 OFFSET $5");
  });

  // -----------------------------------------------------------------------
  // FTS ranking and headline
  // -----------------------------------------------------------------------

  it("uses ts_rank_cd with polish_simple config in SQL", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    await searchArticles(pool, baseOptions());

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain("ts_rank_cd(a.search_vector, to_tsquery('polish_simple', $1), 32)");
  });

  it("generates headline with ts_headline using polish_simple config", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    await searchArticles(pool, baseOptions());

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain("ts_headline(");
    expect(sql).toContain("'polish_simple'");
    expect(sql).toContain("StartSel=<mark>, StopSel=</mark>");
  });

  it("uses search_vector @@ to_tsquery for FTS matching", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    await searchArticles(pool, baseOptions());

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain("a.search_vector @@ to_tsquery('polish_simple', $1)");
  });

  it("orders results by rank DESC then published_at DESC NULLS LAST", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    await searchArticles(pool, baseOptions());

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain("ORDER BY rank DESC, published_at DESC NULLS LAST");
  });

  // -----------------------------------------------------------------------
  // Result mapping
  // -----------------------------------------------------------------------

  it("returns results mapped to SearchResult type with correct field names", async () => {
    const row = makeSampleRow();
    mockQuery.mockResolvedValue({ rows: [row], rowCount: 1 });

    const result = await searchArticles(pool, baseOptions());

    expect(result.articles).toHaveLength(1);
    const article = result.articles[0];
    expect(article).toEqual({
      id: "art-1",
      url: "https://example.com/article-1",
      title: "AI in 2026",
      intro: "A brief intro about artificial intelligence",
      summary: "Full summary of the article",
      imageUrl: "https://example.com/img.jpg",
      author: "Jan Kowalski",
      publishedAt: new Date("2026-01-15T10:00:00Z"),
      createdAt: new Date("2026-01-15T12:00:00Z"),
      catalogSourceId: "src-1",
      privateSourceId: null,
      rank: 0.75,
      headline: "<mark>AI</mark> in 2026",
    });
  });

  it("returns total count from total_count window function", async () => {
    const rows = [
      makeSampleRow({ id: "art-1", total_count: "25" }),
      makeSampleRow({ id: "art-2", total_count: "25" }),
    ];
    mockQuery.mockResolvedValue({ rows, rowCount: 2 });

    const result = await searchArticles(pool, baseOptions());

    expect(result.total).toBe(25);
    expect(result.articles).toHaveLength(2);
  });

  it("returns total=0 when query returns no rows", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    const result = await searchArticles(pool, baseOptions());

    expect(result.total).toBe(0);
    expect(result.articles).toEqual([]);
  });

  it("parses rank as float", async () => {
    const row = makeSampleRow({ rank: "0.123456" });
    mockQuery.mockResolvedValue({ rows: [row], rowCount: 1 });

    const result = await searchArticles(pool, baseOptions());

    expect(result.articles[0].rank).toBeCloseTo(0.123456);
    expect(typeof result.articles[0].rank).toBe("number");
  });

  it("maps multiple rows correctly", async () => {
    const rows = [
      makeSampleRow({ id: "art-1", title: "First", total_count: "3" }),
      makeSampleRow({ id: "art-2", title: "Second", total_count: "3" }),
      makeSampleRow({ id: "art-3", title: "Third", total_count: "3" }),
    ];
    mockQuery.mockResolvedValue({ rows, rowCount: 3 });

    const result = await searchArticles(pool, baseOptions());

    expect(result.articles).toHaveLength(3);
    expect(result.articles[0].id).toBe("art-1");
    expect(result.articles[1].id).toBe("art-2");
    expect(result.articles[2].id).toBe("art-3");
    expect(result.total).toBe(3);
  });

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------

  it("returns empty results on database query error", async () => {
    mockQuery.mockRejectedValue(new Error("connection timeout"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await searchArticles(pool, baseOptions());

    expect(result).toEqual({ articles: [], total: 0 });
    expect(consoleSpy).toHaveBeenCalledWith("Search error:", expect.any(Error));
    consoleSpy.mockRestore();
  });

  it("does not throw on database error — returns graceful fallback", async () => {
    mockQuery.mockRejectedValue(new Error("syntax error"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      searchArticles(pool, baseOptions())
    ).resolves.toEqual({ articles: [], total: 0 });

    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // COUNT(*) OVER() window function
  // -----------------------------------------------------------------------

  it("uses COUNT(*) OVER() window function for total count", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    await searchArticles(pool, baseOptions());

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain("COUNT(*) OVER() as total_count");
  });

  it("executes only a single query (not separate count query)", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    await searchArticles(pool, baseOptions());

    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  // -----------------------------------------------------------------------
  // CTE structure
  // -----------------------------------------------------------------------

  it("uses a CTE named search_results", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    await searchArticles(pool, baseOptions());

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain("WITH search_results AS");
  });

  // -----------------------------------------------------------------------
  // Handles null fields in result rows
  // -----------------------------------------------------------------------

  it("handles null fields in database rows", async () => {
    const row = makeSampleRow({
      intro: null,
      summary: null,
      image_url: null,
      author: null,
      published_at: null,
      private_source_id: null,
      headline: null,
    });
    mockQuery.mockResolvedValue({ rows: [row], rowCount: 1 });

    const result = await searchArticles(pool, baseOptions());

    const article = result.articles[0];
    expect(article.intro).toBeNull();
    expect(article.summary).toBeNull();
    expect(article.imageUrl).toBeNull();
    expect(article.author).toBeNull();
    expect(article.publishedAt).toBeNull();
    expect(article.privateSourceId).toBeNull();
    expect(article.headline).toBeNull();
  });
});
