// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const { mockGenerateText } = vi.hoisted(() => ({
  mockGenerateText: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    edition: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    article: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    userSubscription: {
      findMany: vi.fn(),
    },
    privateSource: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/ai/llm", () => ({
  getLLMProvider: vi.fn().mockResolvedValue({
    generateText: mockGenerateText,
  }),
}));

import { prisma } from "@/lib/prisma";
import { getLLMProvider } from "@/lib/ai/llm";
import {
  getOrCreateEdition,
  addArticleToEdition,
  getUserEditions,
  getEditionWithArticles,
  updateEditionUnreadCount,
  updateEditionCounts,
  generateEditionSummary,
  createDailyEditions,
  backfillEditions,
} from "../editionService";

// ---------------------------------------------------------------------------
// Typed mock helpers
// ---------------------------------------------------------------------------
const mockEditionFindUnique = prisma.edition.findUnique as ReturnType<typeof vi.fn>;
const mockEditionFindFirst = prisma.edition.findFirst as ReturnType<typeof vi.fn>;
const mockEditionFindMany = prisma.edition.findMany as ReturnType<typeof vi.fn>;
const mockEditionCreate = prisma.edition.create as ReturnType<typeof vi.fn>;
const mockEditionUpdate = prisma.edition.update as ReturnType<typeof vi.fn>;

const mockArticleFindMany = prisma.article.findMany as ReturnType<typeof vi.fn>;
const mockArticleUpdate = prisma.article.update as ReturnType<typeof vi.fn>;
const mockArticleUpdateMany = prisma.article.updateMany as ReturnType<typeof vi.fn>;

const mockUserFindMany = prisma.user.findMany as ReturnType<typeof vi.fn>;

const mockUserSubscriptionFindMany = prisma.userSubscription.findMany as ReturnType<typeof vi.fn>;
const mockPrivateSourceFindMany = prisma.privateSource.findMany as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-02-28T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

// ===========================================================================
// formatEditionTitle (tested indirectly via getOrCreateEdition)
// ===========================================================================
describe("formatEditionTitle (via getOrCreateEdition)", () => {
  // When getOrCreateEdition creates a new edition, it calls formatEditionTitle
  // to generate the title. We verify the title by inspecting the create call.

  it("formats Saturday 28 February correctly in Polish", async () => {
    // 2026-02-28 is a Saturday
    mockEditionFindUnique.mockResolvedValue(null);
    mockEditionCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({
        id: "ed-1",
        ...data,
        articleCount: 0,
        unreadCount: 0,
      })
    );

    const result = await getOrCreateEdition("user-1", new Date("2026-02-28T15:00:00Z"));

    expect(result.title).toBe("Wydanie z sobota, 28 lutego");
  });

  it("formats Monday 2 March correctly in Polish", async () => {
    // 2026-03-02 is a Monday
    vi.setSystemTime(new Date("2026-03-02T10:00:00Z"));
    mockEditionFindUnique.mockResolvedValue(null);
    mockEditionCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({
        id: "ed-2",
        ...data,
        articleCount: 0,
        unreadCount: 0,
      })
    );

    await getOrCreateEdition("user-1", new Date("2026-03-02T10:00:00Z"));

    const createCall = mockEditionCreate.mock.calls[0][0].data;
    expect(createCall.title).toBe("Wydanie z poniedziałek, 2 marca");
  });

  it("formats Wednesday 1 January correctly (New Year)", async () => {
    vi.setSystemTime(new Date("2025-01-01T10:00:00Z"));
    mockEditionFindUnique.mockResolvedValue(null);
    mockEditionCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({
        id: "ed-3",
        ...data,
        articleCount: 0,
        unreadCount: 0,
      })
    );

    await getOrCreateEdition("user-1", new Date("2025-01-01T10:00:00Z"));

    const createCall = mockEditionCreate.mock.calls[0][0].data;
    expect(createCall.title).toBe("Wydanie z środa, 1 stycznia");
  });

  it("formats Sunday 31 December correctly", async () => {
    vi.setSystemTime(new Date("2023-12-31T10:00:00Z"));
    mockEditionFindUnique.mockResolvedValue(null);
    mockEditionCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({
        id: "ed-4",
        ...data,
        articleCount: 0,
        unreadCount: 0,
      })
    );

    await getOrCreateEdition("user-1", new Date("2023-12-31T10:00:00Z"));

    const createCall = mockEditionCreate.mock.calls[0][0].data;
    expect(createCall.title).toBe("Wydanie z niedziela, 31 grudnia");
  });
});

// ===========================================================================
// getOrCreateEdition
// ===========================================================================
describe("getOrCreateEdition", () => {
  it("returns existing edition if found", async () => {
    const existing = {
      id: "ed-existing",
      userId: "user-1",
      date: new Date("2026-02-28"),
      title: "Wydanie z sobota, 28 lutego",
      articleCount: 5,
      unreadCount: 3,
    };
    mockEditionFindUnique.mockResolvedValue(existing);

    const result = await getOrCreateEdition("user-1", new Date("2026-02-28T15:30:00Z"));

    expect(result).toEqual(existing);
    expect(mockEditionCreate).not.toHaveBeenCalled();
  });

  it("creates new edition when not found", async () => {
    mockEditionFindUnique.mockResolvedValue(null);
    const created = {
      id: "ed-new",
      userId: "user-1",
      date: new Date("2026-02-28"),
      title: "Wydanie z sobota, 28 lutego",
      articleCount: 0,
      unreadCount: 0,
    };
    mockEditionCreate.mockResolvedValue(created);

    const result = await getOrCreateEdition("user-1", new Date("2026-02-28T15:30:00Z"));

    expect(result).toEqual(created);
    expect(mockEditionCreate).toHaveBeenCalledTimes(1);
  });

  it("normalizes date to date-only (strips time component)", async () => {
    mockEditionFindUnique.mockResolvedValue(null);
    mockEditionCreate.mockResolvedValue({
      id: "ed-1",
      userId: "user-1",
      date: new Date("2026-02-28"),
      title: "test",
      articleCount: 0,
      unreadCount: 0,
    });

    await getOrCreateEdition("user-1", new Date("2026-02-28T23:59:59Z"));

    const findCall = mockEditionFindUnique.mock.calls[0][0];
    const dateUsed = findCall.where.userId_date.date as Date;
    // Date should be midnight UTC (no time)
    expect(dateUsed.toISOString()).toBe("2026-02-28T00:00:00.000Z");
  });

  it("uses userId_date compound key for lookup", async () => {
    mockEditionFindUnique.mockResolvedValue({ id: "ed-1" });

    await getOrCreateEdition("user-123", new Date("2026-02-28T10:00:00Z"));

    expect(mockEditionFindUnique).toHaveBeenCalledWith({
      where: {
        userId_date: {
          userId: "user-123",
          date: new Date("2026-02-28T00:00:00.000Z"),
        },
      },
    });
  });
});

// ===========================================================================
// addArticleToEdition
// ===========================================================================
describe("addArticleToEdition", () => {
  it("links article to today's edition and increments counts", async () => {
    // getOrCreateEdition will find existing
    mockEditionFindUnique.mockResolvedValue({
      id: "ed-today",
      userId: "user-1",
      date: new Date("2026-02-28"),
      title: "Wydanie z sobota, 28 lutego",
      articleCount: 3,
      unreadCount: 2,
    });
    mockArticleUpdate.mockResolvedValue({});
    mockEditionUpdate.mockResolvedValue({});

    await addArticleToEdition("art-1", "user-1");

    expect(mockArticleUpdate).toHaveBeenCalledWith({
      where: { id: "art-1" },
      data: { editionId: "ed-today" },
    });

    expect(mockEditionUpdate).toHaveBeenCalledWith({
      where: { id: "ed-today" },
      data: {
        articleCount: { increment: 1 },
        unreadCount: { increment: 1 },
      },
    });
  });

  it("creates edition if none exists for today, then links article", async () => {
    mockEditionFindUnique.mockResolvedValue(null);
    mockEditionCreate.mockResolvedValue({
      id: "ed-new",
      userId: "user-1",
      date: new Date("2026-02-28"),
      title: "Wydanie z sobota, 28 lutego",
      articleCount: 0,
      unreadCount: 0,
    });
    mockArticleUpdate.mockResolvedValue({});
    mockEditionUpdate.mockResolvedValue({});

    await addArticleToEdition("art-2", "user-1");

    expect(mockEditionCreate).toHaveBeenCalledTimes(1);
    expect(mockArticleUpdate).toHaveBeenCalledWith({
      where: { id: "art-2" },
      data: { editionId: "ed-new" },
    });
  });
});

// ===========================================================================
// getUserEditions
// ===========================================================================
describe("getUserEditions", () => {
  it("returns editions with computed article and unread counts", async () => {
    mockEditionFindMany.mockResolvedValue([
      {
        id: "ed-1",
        date: new Date("2026-02-28"),
        title: "Wydanie z sobota, 28 lutego",
        summary: "Podsumowanie",
        articles: [
          { id: "a1", readBy: [{ userId: "u1" }] },
          { id: "a2", readBy: [] },
          { id: "a3", readBy: [] },
        ],
      },
    ]);

    const result = await getUserEditions("u1");

    expect(result).toHaveLength(1);
    expect(result[0].articleCount).toBe(3);
    expect(result[0].unreadCount).toBe(2);
    expect(result[0].summary).toBe("Podsumowanie");
  });

  it("uses default limit of 30", async () => {
    mockEditionFindMany.mockResolvedValue([]);

    await getUserEditions("u1");

    const callArgs = mockEditionFindMany.mock.calls[0][0];
    expect(callArgs.take).toBe(30);
    expect(callArgs.orderBy).toEqual({ date: "desc" });
  });

  it("respects custom limit parameter", async () => {
    mockEditionFindMany.mockResolvedValue([]);

    await getUserEditions("u1", 5);

    const callArgs = mockEditionFindMany.mock.calls[0][0];
    expect(callArgs.take).toBe(5);
  });

  it("returns empty array when no editions exist", async () => {
    mockEditionFindMany.mockResolvedValue([]);

    const result = await getUserEditions("u1");

    expect(result).toEqual([]);
  });

  it("counts all articles as unread when none have readBy entries", async () => {
    mockEditionFindMany.mockResolvedValue([
      {
        id: "ed-1",
        date: new Date("2026-02-28"),
        title: "Title",
        summary: null,
        articles: [
          { id: "a1", readBy: [] },
          { id: "a2", readBy: [] },
        ],
      },
    ]);

    const result = await getUserEditions("u1");

    expect(result[0].articleCount).toBe(2);
    expect(result[0].unreadCount).toBe(2);
  });
});

// ===========================================================================
// getEditionWithArticles
// ===========================================================================
describe("getEditionWithArticles", () => {
  it("returns null when edition not found", async () => {
    mockEditionFindFirst.mockResolvedValue(null);

    const result = await getEditionWithArticles("ed-missing", "u1");

    expect(result).toBeNull();
  });

  it("returns edition with mapped article data", async () => {
    mockEditionFindFirst.mockResolvedValue({
      id: "ed-1",
      date: new Date("2026-02-28"),
      title: "Wydanie z sobota, 28 lutego",
      summary: "Summary text",
      articles: [
        {
          id: "a1",
          title: "Article One",
          intro: "Intro text",
          summary: "Article summary",
          url: "https://example.com/1",
          imageUrl: "https://example.com/img.jpg",
          publishedAt: new Date("2026-02-28T10:00:00Z"),
          catalogSource: { name: "TechNews", logoUrl: "https://logo.png" },
          privateSource: null,
          readBy: [{ userId: "u1" }],
          savedBy: [{ userId: "u1" }],
        },
        {
          id: "a2",
          title: "Article Two",
          intro: null,
          summary: null,
          url: "https://example.com/2",
          imageUrl: null,
          publishedAt: null,
          catalogSource: null,
          privateSource: { name: "My Blog" },
          readBy: [],
          savedBy: [],
        },
      ],
    });

    const result = await getEditionWithArticles("ed-1", "u1");

    expect(result).not.toBeNull();
    expect(result!.articleCount).toBe(2);
    expect(result!.unreadCount).toBe(1);
    expect(result!.articles).toHaveLength(2);

    // First article: read and saved
    expect(result!.articles[0].isRead).toBe(true);
    expect(result!.articles[0].isSaved).toBe(true);
    expect(result!.articles[0].catalogSource).toEqual({ name: "TechNews", logoUrl: "https://logo.png" });

    // Second article: unread and not saved
    expect(result!.articles[1].isRead).toBe(false);
    expect(result!.articles[1].isSaved).toBe(false);
    expect(result!.articles[1].privateSource).toEqual({ name: "My Blog" });
  });

  it("filters by editionId and userId", async () => {
    mockEditionFindFirst.mockResolvedValue(null);

    await getEditionWithArticles("ed-42", "user-99");

    const findArgs = mockEditionFindFirst.mock.calls[0][0];
    expect(findArgs.where).toEqual({ id: "ed-42", userId: "user-99" });
  });

  it("computes correct counts when all articles are read", async () => {
    mockEditionFindFirst.mockResolvedValue({
      id: "ed-1",
      date: new Date("2026-02-28"),
      title: "Title",
      summary: null,
      articles: [
        {
          id: "a1", title: "A1", intro: null, summary: null,
          url: "https://x.com/1", imageUrl: null, publishedAt: null,
          catalogSource: null, privateSource: null,
          readBy: [{ userId: "u1" }], savedBy: [],
        },
        {
          id: "a2", title: "A2", intro: null, summary: null,
          url: "https://x.com/2", imageUrl: null, publishedAt: null,
          catalogSource: null, privateSource: null,
          readBy: [{ userId: "u1" }], savedBy: [],
        },
      ],
    });

    const result = await getEditionWithArticles("ed-1", "u1");

    expect(result!.articleCount).toBe(2);
    expect(result!.unreadCount).toBe(0);
  });
});

// ===========================================================================
// updateEditionUnreadCount
// ===========================================================================
describe("updateEditionUnreadCount", () => {
  it("recalculates unread count and updates edition", async () => {
    mockEditionFindUnique.mockResolvedValue({
      id: "ed-1",
      articles: [
        { id: "a1", readBy: [{ userId: "u1" }] },
        { id: "a2", readBy: [] },
        { id: "a3", readBy: [] },
      ],
    });
    mockEditionUpdate.mockResolvedValue({});

    await updateEditionUnreadCount("ed-1");

    expect(mockEditionUpdate).toHaveBeenCalledWith({
      where: { id: "ed-1" },
      data: { unreadCount: 2 },
    });
  });

  it("sets unread count to 0 when all articles are read", async () => {
    mockEditionFindUnique.mockResolvedValue({
      id: "ed-1",
      articles: [
        { id: "a1", readBy: [{ userId: "u1" }] },
        { id: "a2", readBy: [{ userId: "u2" }] },
      ],
    });
    mockEditionUpdate.mockResolvedValue({});

    await updateEditionUnreadCount("ed-1");

    expect(mockEditionUpdate).toHaveBeenCalledWith({
      where: { id: "ed-1" },
      data: { unreadCount: 0 },
    });
  });

  it("does nothing when edition not found", async () => {
    mockEditionFindUnique.mockResolvedValue(null);

    await updateEditionUnreadCount("ed-missing");

    expect(mockEditionUpdate).not.toHaveBeenCalled();
  });

  it("handles edition with no articles", async () => {
    mockEditionFindUnique.mockResolvedValue({
      id: "ed-1",
      articles: [],
    });
    mockEditionUpdate.mockResolvedValue({});

    await updateEditionUnreadCount("ed-1");

    expect(mockEditionUpdate).toHaveBeenCalledWith({
      where: { id: "ed-1" },
      data: { unreadCount: 0 },
    });
  });
});

// ===========================================================================
// updateEditionCounts
// ===========================================================================
describe("updateEditionCounts", () => {
  it("recalculates article and unread counts (excluding dismissed)", async () => {
    mockEditionFindUnique.mockResolvedValue({
      id: "ed-1",
      articles: [
        { id: "a1", readBy: [{ userId: "u1" }] },
        { id: "a2", readBy: [] },
        { id: "a3", readBy: [] },
      ],
    });
    mockEditionUpdate.mockResolvedValue({});

    const result = await updateEditionCounts("ed-1", "u1");

    expect(result).toEqual({ articleCount: 3, unreadCount: 2 });
    expect(mockEditionUpdate).toHaveBeenCalledWith({
      where: { id: "ed-1" },
      data: { articleCount: 3, unreadCount: 2 },
    });
  });

  it("returns zeros when edition not found", async () => {
    mockEditionFindUnique.mockResolvedValue(null);

    const result = await updateEditionCounts("ed-missing", "u1");

    expect(result).toEqual({ articleCount: 0, unreadCount: 0 });
    expect(mockEditionUpdate).not.toHaveBeenCalled();
  });

  it("returns zeros when edition has no non-dismissed articles", async () => {
    mockEditionFindUnique.mockResolvedValue({
      id: "ed-1",
      articles: [],
    });
    mockEditionUpdate.mockResolvedValue({});

    const result = await updateEditionCounts("ed-1", "u1");

    expect(result).toEqual({ articleCount: 0, unreadCount: 0 });
  });

  it("passes userId in dismissedBy filter on findUnique", async () => {
    mockEditionFindUnique.mockResolvedValue({ id: "ed-1", articles: [] });
    mockEditionUpdate.mockResolvedValue({});

    await updateEditionCounts("ed-1", "user-xyz");

    const findArgs = mockEditionFindUnique.mock.calls[0][0];
    expect(findArgs.include.articles.where).toEqual({
      dismissedBy: { none: { userId: "user-xyz" } },
    });
  });
});

// ===========================================================================
// generateEditionSummary
// ===========================================================================
describe("generateEditionSummary", () => {
  it("generates summary from LLM and saves to edition", async () => {
    mockEditionFindUnique.mockResolvedValue({
      id: "ed-1",
      articles: [
        { title: "AI rewolucja", intro: "Wprowadzenie do AI" },
        { title: "Klimat 2026", intro: null },
      ],
    });
    mockGenerateText.mockResolvedValue("Dzis najwazniejsze tematy to AI i klimat.");
    mockEditionUpdate.mockResolvedValue({});

    const result = await generateEditionSummary("ed-1");

    expect(result).toBe("Dzis najwazniejsze tematy to AI i klimat.");
    expect(mockEditionUpdate).toHaveBeenCalledWith({
      where: { id: "ed-1" },
      data: { summary: "Dzis najwazniejsze tematy to AI i klimat." },
    });
  });

  it("returns empty string when edition not found", async () => {
    mockEditionFindUnique.mockResolvedValue(null);

    const result = await generateEditionSummary("ed-missing");

    expect(result).toBe("");
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it("returns empty string when edition has no articles", async () => {
    mockEditionFindUnique.mockResolvedValue({
      id: "ed-1",
      articles: [],
    });

    const result = await generateEditionSummary("ed-1");

    expect(result).toBe("");
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it("returns empty string on LLM error", async () => {
    mockEditionFindUnique.mockResolvedValue({
      id: "ed-1",
      articles: [{ title: "Test article", intro: "Intro" }],
    });
    mockGenerateText.mockRejectedValue(new Error("API error"));

    const result = await generateEditionSummary("ed-1");

    expect(result).toBe("");
    expect(mockEditionUpdate).not.toHaveBeenCalled();
  });

  it("builds numbered article list in the prompt", async () => {
    mockEditionFindUnique.mockResolvedValue({
      id: "ed-1",
      articles: [
        { title: "First Article", intro: "First intro" },
        { title: "Second Article", intro: null },
      ],
    });
    mockGenerateText.mockResolvedValue("Summary.");
    mockEditionUpdate.mockResolvedValue({});

    await generateEditionSummary("ed-1");

    const prompt = mockGenerateText.mock.calls[0][0] as string;
    expect(prompt).toContain("1. First Article - First intro");
    expect(prompt).toContain("2. Second Article");
    // Second article has no intro, so no " - "
    expect(prompt).not.toContain("2. Second Article - ");
  });

  it("passes maxTokens: 300 to the LLM", async () => {
    mockEditionFindUnique.mockResolvedValue({
      id: "ed-1",
      articles: [{ title: "Test", intro: "Intro" }],
    });
    mockGenerateText.mockResolvedValue("Summary.");
    mockEditionUpdate.mockResolvedValue({});

    await generateEditionSummary("ed-1");

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.any(String),
      { maxTokens: 300 }
    );
  });

  it("limits to 20 articles in query", async () => {
    mockEditionFindUnique.mockResolvedValue({
      id: "ed-1",
      articles: [{ title: "Article", intro: "Intro" }],
    });
    mockGenerateText.mockResolvedValue("Summary.");
    mockEditionUpdate.mockResolvedValue({});

    await generateEditionSummary("ed-1");

    const findArgs = mockEditionFindUnique.mock.calls[0][0];
    expect(findArgs.include.articles.take).toBe(20);
  });
});

// ===========================================================================
// createDailyEditions
// ===========================================================================
describe("createDailyEditions", () => {
  it("creates editions for users with articles and returns count", async () => {
    mockUserFindMany.mockResolvedValue([
      { id: "user-1" },
      { id: "user-2" },
    ]);

    // user-1: no existing edition, has articles
    // user-2: no existing edition, no articles
    mockEditionFindUnique
      .mockResolvedValueOnce(null)  // user-1 check
      .mockResolvedValueOnce(null); // user-2 check

    mockArticleFindMany
      .mockResolvedValueOnce([{ id: "a1" }, { id: "a2" }])  // user-1 articles
      .mockResolvedValueOnce([]);                             // user-2 articles

    mockEditionCreate.mockResolvedValue({ id: "ed-1" });
    mockArticleUpdateMany.mockResolvedValue({ count: 2 });

    // generateEditionSummary mock (called for ed-1)
    // Re-mock findUnique for the summary call
    mockEditionFindUnique.mockResolvedValueOnce({
      id: "ed-1",
      articles: [{ title: "Art 1", intro: "Intro 1" }],
    });
    mockGenerateText.mockResolvedValue("Daily summary");
    mockEditionUpdate.mockResolvedValue({});

    const result = await createDailyEditions();

    expect(result).toBe(1); // Only user-1 got an edition
    expect(mockEditionCreate).toHaveBeenCalledTimes(1);
  });

  it("skips users who already have today's edition", async () => {
    mockUserFindMany.mockResolvedValue([{ id: "user-1" }]);
    mockEditionFindUnique.mockResolvedValue({ id: "ed-existing" }); // already exists

    const result = await createDailyEditions();

    expect(result).toBe(0);
    expect(mockEditionCreate).not.toHaveBeenCalled();
  });

  it("skips users with no articles for today", async () => {
    mockUserFindMany.mockResolvedValue([{ id: "user-1" }]);
    mockEditionFindUnique.mockResolvedValueOnce(null); // no existing edition
    mockArticleFindMany.mockResolvedValue([]); // no articles

    const result = await createDailyEditions();

    expect(result).toBe(0);
    expect(mockEditionCreate).not.toHaveBeenCalled();
  });

  it("returns 0 when there are no users", async () => {
    mockUserFindMany.mockResolvedValue([]);

    const result = await createDailyEditions();

    expect(result).toBe(0);
  });

  it("links articles to the created edition via updateMany", async () => {
    mockUserFindMany.mockResolvedValue([{ id: "user-1" }]);
    mockEditionFindUnique.mockResolvedValueOnce(null);
    mockArticleFindMany.mockResolvedValueOnce([{ id: "a1" }, { id: "a2" }]);
    mockEditionCreate.mockResolvedValue({ id: "ed-new" });
    mockArticleUpdateMany.mockResolvedValue({ count: 2 });
    // generateEditionSummary call
    mockEditionFindUnique.mockResolvedValueOnce({
      id: "ed-new",
      articles: [],
    });

    await createDailyEditions();

    expect(mockArticleUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["a1", "a2"] } },
      data: { editionId: "ed-new" },
    });
  });

  it("creates edition with correct article counts", async () => {
    mockUserFindMany.mockResolvedValue([{ id: "user-1" }]);
    mockEditionFindUnique.mockResolvedValueOnce(null);
    mockArticleFindMany.mockResolvedValueOnce([{ id: "a1" }, { id: "a2" }, { id: "a3" }]);
    mockEditionCreate.mockResolvedValue({ id: "ed-new" });
    mockArticleUpdateMany.mockResolvedValue({ count: 3 });
    mockEditionFindUnique.mockResolvedValueOnce({ id: "ed-new", articles: [] });

    await createDailyEditions();

    const createArgs = mockEditionCreate.mock.calls[0][0].data;
    expect(createArgs.articleCount).toBe(3);
    expect(createArgs.unreadCount).toBe(3);
  });
});

// ===========================================================================
// backfillEditions
// ===========================================================================
describe("backfillEditions", () => {
  it("returns 0 when user has no subscriptions or private sources", async () => {
    mockUserSubscriptionFindMany.mockResolvedValue([]);
    mockPrivateSourceFindMany.mockResolvedValue([]);

    const result = await backfillEditions("user-1");

    expect(result).toBe(0);
    expect(mockArticleFindMany).not.toHaveBeenCalled();
  });

  it("returns 0 when no unassigned articles exist", async () => {
    mockUserSubscriptionFindMany.mockResolvedValue([
      { catalogSourceId: "src-1" },
    ]);
    mockPrivateSourceFindMany.mockResolvedValue([]);
    mockArticleFindMany.mockResolvedValue([]);

    const result = await backfillEditions("user-1");

    expect(result).toBe(0);
  });

  it("creates editions grouped by article date", async () => {
    mockUserSubscriptionFindMany.mockResolvedValue([
      { catalogSourceId: "src-1" },
    ]);
    mockPrivateSourceFindMany.mockResolvedValue([]);

    mockArticleFindMany.mockResolvedValue([
      { id: "a1", createdAt: new Date("2026-02-28T10:00:00Z"), readBy: [] },
      { id: "a2", createdAt: new Date("2026-02-28T14:00:00Z"), readBy: [] },
      { id: "a3", createdAt: new Date("2026-02-27T10:00:00Z"), readBy: [{ userId: "user-1" }] },
    ]);

    // No existing editions
    mockEditionFindUnique.mockResolvedValue(null);

    mockEditionCreate
      .mockResolvedValueOnce({ id: "ed-28" })
      .mockResolvedValueOnce({ id: "ed-27" });
    mockArticleUpdateMany.mockResolvedValue({ count: 2 });

    const result = await backfillEditions("user-1");

    expect(result).toBe(2); // Two date groups -> two editions
    expect(mockEditionCreate).toHaveBeenCalledTimes(2);
  });

  it("links articles to existing edition instead of creating new one", async () => {
    mockUserSubscriptionFindMany.mockResolvedValue([
      { catalogSourceId: "src-1" },
    ]);
    mockPrivateSourceFindMany.mockResolvedValue([]);

    mockArticleFindMany.mockResolvedValue([
      { id: "a1", createdAt: new Date("2026-02-28T10:00:00Z"), readBy: [] },
    ]);

    // Edition already exists for this date
    mockEditionFindUnique.mockResolvedValue({ id: "ed-existing" });
    mockArticleUpdateMany.mockResolvedValue({ count: 1 });
    mockEditionUpdate.mockResolvedValue({});

    const result = await backfillEditions("user-1");

    expect(result).toBe(0); // No new editions created
    expect(mockEditionCreate).not.toHaveBeenCalled();

    // Articles should be linked to existing edition
    expect(mockArticleUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["a1"] } },
      data: { editionId: "ed-existing" },
    });

    // Counts should be updated on existing edition
    expect(mockEditionUpdate).toHaveBeenCalledWith({
      where: { id: "ed-existing" },
      data: {
        articleCount: { increment: 1 },
        unreadCount: { increment: 1 },
      },
    });
  });

  it("correctly counts unread articles (excluding already-read)", async () => {
    mockUserSubscriptionFindMany.mockResolvedValue([
      { catalogSourceId: "src-1" },
    ]);
    mockPrivateSourceFindMany.mockResolvedValue([]);

    mockArticleFindMany.mockResolvedValue([
      { id: "a1", createdAt: new Date("2026-02-28T10:00:00Z"), readBy: [] },
      { id: "a2", createdAt: new Date("2026-02-28T14:00:00Z"), readBy: [{ userId: "user-1" }] },
    ]);

    mockEditionFindUnique.mockResolvedValue(null);
    mockEditionCreate.mockResolvedValue({ id: "ed-28" });
    mockArticleUpdateMany.mockResolvedValue({ count: 2 });

    await backfillEditions("user-1");

    const createArgs = mockEditionCreate.mock.calls[0][0].data;
    expect(createArgs.articleCount).toBe(2);
    expect(createArgs.unreadCount).toBe(1); // Only a1 is unread
  });

  it("uses both subscribed and private source IDs for article lookup", async () => {
    mockUserSubscriptionFindMany.mockResolvedValue([
      { catalogSourceId: "cat-1" },
      { catalogSourceId: "cat-2" },
    ]);
    mockPrivateSourceFindMany.mockResolvedValue([
      { id: "priv-1" },
    ]);
    mockArticleFindMany.mockResolvedValue([]);

    await backfillEditions("user-1");

    const findArgs = mockArticleFindMany.mock.calls[0][0];
    expect(findArgs.where.editionId).toBeNull();
    expect(findArgs.where.OR).toEqual([
      { catalogSourceId: { in: ["cat-1", "cat-2"] } },
      { privateSourceId: { in: ["priv-1"] } },
    ]);
  });
});
