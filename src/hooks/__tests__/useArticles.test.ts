vi.mock("@/components/articles/EditionTabs", () => ({
  getArticleDate: vi.fn(
    (article: { publishedAt?: string | null }) =>
      article.publishedAt?.slice(0, 10) || "2026-01-01"
  ),
  formatEditionLabel: vi.fn((date: string) => date),
}));

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useArticles } from "@/hooks/useArticles";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockArticle = (overrides: Record<string, unknown> = {}) => ({
  id: "1",
  title: "Test Article",
  url: "https://example.com/test",
  source: { id: "src-1", name: "Test Source", logoUrl: null },
  publishedAt: "2026-02-28T10:00:00Z",
  isSaved: false,
  isRead: false,
  author: null,
  intro: null,
  summary: null,
  imageUrl: null,
  createdAt: "2026-02-28T10:00:00Z",
  ...overrides,
});

function mockFetchSuccess(data: object) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
  });
}

function mockFetchError(status: number) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    json: () => Promise.resolve({}),
  });
}

function standardResponse(
  articles: ReturnType<typeof mockArticle>[],
  opts: { total?: number; hasMore?: boolean; sources?: object[] } = {}
) {
  return {
    articles,
    pagination: {
      total: opts.total ?? articles.length,
      hasMore: opts.hasMore ?? false,
      limit: 20,
      offset: 0,
    },
    ...(opts.sources ? { sources: opts.sources } : {}),
  };
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

let originalFetch: typeof globalThis.fetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
  vi.restoreAllMocks();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// ===== fetchArticles (initial load) ========================================

describe("useArticles – fetchArticles (initial load)", () => {
  it("fetches articles on mount and sets state correctly", async () => {
    const articles = [mockArticle(), mockArticle({ id: "2", title: "Second" })];
    globalThis.fetch = mockFetchSuccess(
      standardResponse(articles, { total: 2, hasMore: false })
    );

    const { result } = renderHook(() => useArticles());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.articles).toHaveLength(2);
    expect(result.current.totalCount).toBe(2);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("passes sourceId and search as query params in URL", async () => {
    const fetchSpy = mockFetchSuccess(standardResponse([]));
    globalThis.fetch = fetchSpy;

    const { result } = renderHook(() =>
      useArticles({ sourceId: "s1", search: "react" })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const url = fetchSpy.mock.calls[0][0] as string;
    expect(url).toContain("sourceId=s1");
    expect(url).toContain("search=react");
    expect(url).toContain("limit=20");
    expect(url).toContain("offset=0");
  });

  it('sets error "Zaloguj się, aby zobaczyć artykuły" on 401 response', async () => {
    globalThis.fetch = mockFetchError(401);

    const { result } = renderHook(() => useArticles());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe("Zaloguj się, aby zobaczyć artykuły");
    expect(result.current.articles).toHaveLength(0);
  });

  it('sets error "Błąd pobierania artykułów" on non-401 server error', async () => {
    globalThis.fetch = mockFetchError(500);

    const { result } = renderHook(() => useArticles());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe("Błąd pobierania artykułów");
  });

  it("sets error message from Error on network failure", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useArticles());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe("Network error");
  });

  it('builds sources from server-provided sources data (includes "Wszystkie" with id=null)', async () => {
    const serverSources = [
      { id: "src-1", name: "Source A", count: 5 },
      { id: "src-2", name: "Source B", count: 3 },
    ];
    globalThis.fetch = mockFetchSuccess(
      standardResponse([mockArticle()], { total: 8, sources: serverSources })
    );

    const { result } = renderHook(() => useArticles());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.sources).toHaveLength(3);
    expect(result.current.sources[0]).toEqual({
      id: null,
      name: "Wszystkie",
      count: 8,
    });
    expect(result.current.sources[1]).toEqual({
      id: "src-1",
      name: "Source A",
      count: 5,
    });
    expect(result.current.sources[2]).toEqual({
      id: "src-2",
      name: "Source B",
      count: 3,
    });
  });
});

// ===== loadMore =============================================================

describe("useArticles – loadMore", () => {
  it("appends articles when loadMore is called", async () => {
    const firstPage = [mockArticle({ id: "1" })];
    const secondPage = [mockArticle({ id: "2", title: "Second" })];

    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve(
            standardResponse(firstPage, { total: 2, hasMore: true })
          ),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve(
            standardResponse(secondPage, { total: 2, hasMore: false })
          ),
      });
    globalThis.fetch = fetchFn;

    const { result } = renderHook(() => useArticles());

    // Wait for first load
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.articles).toHaveLength(1);
    expect(result.current.hasMore).toBe(true);

    // Trigger loadMore
    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => expect(result.current.isLoadingMore).toBe(false));

    expect(result.current.articles).toHaveLength(2);
    expect(result.current.articles[1].id).toBe("2");
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("does nothing when hasMore is false", async () => {
    globalThis.fetch = mockFetchSuccess(
      standardResponse([mockArticle()], { total: 1, hasMore: false })
    );

    const { result } = renderHook(() => useArticles());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasMore).toBe(false);

    const fetchRef = globalThis.fetch as ReturnType<typeof vi.fn>;
    const callsBefore = fetchRef.mock.calls.length;

    act(() => {
      result.current.loadMore();
    });

    // fetch should NOT have been called again
    expect(fetchRef.mock.calls.length).toBe(callsBefore);
  });
});

// ===== toggleSave ===========================================================

describe("useArticles – toggleSave", () => {
  it("updates article.isSaved state on successful POST", async () => {
    // Initial load fetch
    const initialFetch = {
      ok: true,
      json: () =>
        Promise.resolve(
          standardResponse([mockArticle({ id: "1", isSaved: false })], {
            total: 1,
          })
        ),
    };
    // toggleSave fetch
    const saveFetch = {
      ok: true,
      json: () => Promise.resolve({ saved: true }),
    };

    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(initialFetch)
      .mockResolvedValueOnce(saveFetch);

    const { result } = renderHook(() => useArticles());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.articles[0].isSaved).toBe(false);

    await act(async () => {
      await result.current.toggleSave("1");
    });

    expect(result.current.articles[0].isSaved).toBe(true);
  });
});

// ===== markAsRead ===========================================================

describe("useArticles – markAsRead", () => {
  it("sets article.isRead to true on successful POST", async () => {
    const initialFetch = {
      ok: true,
      json: () =>
        Promise.resolve(
          standardResponse([mockArticle({ id: "1", isRead: false })], {
            total: 1,
          })
        ),
    };
    const readFetch = { ok: true, json: () => Promise.resolve({}) };

    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(initialFetch)
      .mockResolvedValueOnce(readFetch);

    const { result } = renderHook(() => useArticles());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.articles[0].isRead).toBe(false);

    await act(async () => {
      await result.current.markAsRead("1");
    });

    expect(result.current.articles[0].isRead).toBe(true);
  });
});

// ===== dismissArticle =======================================================

describe("useArticles – dismissArticle", () => {
  it("removes article from state and decrements totalCount", async () => {
    const articles = [
      mockArticle({ id: "1" }),
      mockArticle({ id: "2", title: "Second" }),
    ];

    const initialFetch = {
      ok: true,
      json: () =>
        Promise.resolve(standardResponse(articles, { total: 2 })),
    };
    const dismissFetch = {
      ok: true,
      json: () => Promise.resolve({}),
    };

    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(initialFetch)
      .mockResolvedValueOnce(dismissFetch);

    const { result } = renderHook(() => useArticles());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.articles).toHaveLength(2);
    expect(result.current.totalCount).toBe(2);

    await act(async () => {
      await result.current.dismissArticle("1");
    });

    expect(result.current.articles).toHaveLength(1);
    expect(result.current.articles[0].id).toBe("2");
    expect(result.current.totalCount).toBe(1);
  });
});

// ===== editions (memoized) ==================================================

describe("useArticles – editions", () => {
  it("groups articles by date into editions sorted descending", async () => {
    const articles = [
      mockArticle({ id: "1", publishedAt: "2026-02-28T10:00:00Z", isRead: false }),
      mockArticle({ id: "2", publishedAt: "2026-02-28T12:00:00Z", isRead: true }),
      mockArticle({ id: "3", publishedAt: "2026-02-27T08:00:00Z", isRead: false }),
    ];

    globalThis.fetch = mockFetchSuccess(
      standardResponse(articles, { total: 3 })
    );

    const { result } = renderHook(() => useArticles());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.editions).toHaveLength(2);
    // Sorted descending: 2026-02-28 first, 2026-02-27 second
    expect(result.current.editions[0].date).toBe("2026-02-28");
    expect(result.current.editions[0].count).toBe(2);
    expect(result.current.editions[0].unreadCount).toBe(1);
    expect(result.current.editions[1].date).toBe("2026-02-27");
    expect(result.current.editions[1].count).toBe(1);
    expect(result.current.editions[1].unreadCount).toBe(1);
  });
});

// ===== filteredArticles =====================================================

describe("useArticles – filteredArticles", () => {
  it("returns all articles when editionDate is not set", async () => {
    const articles = [
      mockArticle({ id: "1", publishedAt: "2026-02-28T10:00:00Z" }),
      mockArticle({ id: "2", publishedAt: "2026-02-27T08:00:00Z" }),
    ];

    globalThis.fetch = mockFetchSuccess(
      standardResponse(articles, { total: 2 })
    );

    const { result } = renderHook(() => useArticles());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.filteredArticles).toHaveLength(2);
  });

  it("filters by editionDate when provided", async () => {
    const articles = [
      mockArticle({ id: "1", publishedAt: "2026-02-28T10:00:00Z" }),
      mockArticle({ id: "2", publishedAt: "2026-02-27T08:00:00Z" }),
      mockArticle({ id: "3", publishedAt: "2026-02-28T14:00:00Z" }),
    ];

    globalThis.fetch = mockFetchSuccess(
      standardResponse(articles, { total: 3 })
    );

    const { result } = renderHook(() =>
      useArticles({ editionDate: "2026-02-28" })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.filteredArticles).toHaveLength(2);
    expect(result.current.filteredArticles.every((a) => a.publishedAt?.startsWith("2026-02-28"))).toBe(true);
  });
});
