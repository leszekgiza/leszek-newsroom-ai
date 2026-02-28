// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    dismissedArticle: { findMany: vi.fn() },
    article: { deleteMany: vi.fn() },
  },
}));

import { cleanupExpiredTrash } from "@/lib/trashService";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockFindMany = prisma.dismissedArticle.findMany as ReturnType<typeof vi.fn>;
const mockDeleteMany = prisma.article.deleteMany as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  // Fix current date for deterministic cutoff assertions
  vi.setSystemTime(new Date("2026-02-28T12:00:00Z"));
});

describe("cleanupExpiredTrash", () => {
  it("returns count of deleted articles", async () => {
    mockFindMany.mockResolvedValue([
      { articleId: "a1" },
      { articleId: "a2" },
    ]);
    mockDeleteMany.mockResolvedValue({ count: 2 });

    const result = await cleanupExpiredTrash();

    expect(result).toBe(2);
  });

  it("calculates correct date cutoff (15 days ago)", async () => {
    mockFindMany.mockResolvedValue([]);

    await cleanupExpiredTrash();

    const callArgs = mockFindMany.mock.calls[0][0];
    const cutoffDate = callArgs.where.dismissedAt.lt as Date;

    // Current date is 2026-02-28, so 15 days ago = 2026-02-13
    expect(cutoffDate.toISOString()).toBe("2026-02-13T12:00:00.000Z");
  });

  it("only targets private articles (privateSourceId not null)", async () => {
    mockFindMany.mockResolvedValue([]);

    await cleanupExpiredTrash();

    const callArgs = mockFindMany.mock.calls[0][0];

    // The where clause should filter for articles with privateSourceId not null
    expect(callArgs.where.article).toEqual({ privateSourceId: { not: null } });
  });

  it("handles empty result (no articles to delete) and returns 0", async () => {
    mockFindMany.mockResolvedValue([]);

    const result = await cleanupExpiredTrash();

    expect(result).toBe(0);
    // deleteMany should NOT have been called
    expect(mockDeleteMany).not.toHaveBeenCalled();
  });

  it("passes correct article IDs to deleteMany", async () => {
    mockFindMany.mockResolvedValue([
      { articleId: "art-1" },
      { articleId: "art-2" },
      { articleId: "art-3" },
    ]);
    mockDeleteMany.mockResolvedValue({ count: 3 });

    await cleanupExpiredTrash();

    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["art-1", "art-2", "art-3"] } },
    });
  });
});
