// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockGetCurrentUser, mockPrisma, mockGetConnector } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockPrisma: {
    privateSource: { findFirst: vi.fn(), update: vi.fn() },
    article: { findUnique: vi.fn(), create: vi.fn() },
  },
  mockGetConnector: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

vi.mock("@/lib/connectors/factory", () => ({
  getConnector: (...args: unknown[]) => mockGetConnector(...args),
}));

vi.mock("@/lib/editionService", () => ({
  addArticleToEdition: vi.fn().mockResolvedValue(undefined),
}));

// Mock Prisma namespace for P2002 error check
vi.mock("@prisma/client", () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;
      constructor(message: string, opts: { code: string }) {
        super(message);
        this.code = opts.code;
      }
    },
  },
}));

import { POST } from "../route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createRequest(): NextRequest {
  return new NextRequest("http://localhost:3005/api/connectors/test-id/sync", {
    method: "POST",
  });
}

function createParams(id = "conn-1") {
  return { params: Promise.resolve({ id }) };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/connectors/[id]/sync", () => {
  it("returns 401 when user is not authenticated", async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const response = await POST(createRequest(), createParams());

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 404 when connector not found", async () => {
    mockGetCurrentUser.mockResolvedValue({ userId: "user-1" });
    mockPrisma.privateSource.findFirst.mockResolvedValue(null);

    const response = await POST(createRequest(), createParams("nonexistent"));

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Connector not found");
  });

  it("returns 409 when sync is already in progress", async () => {
    mockGetCurrentUser.mockResolvedValue({ userId: "user-1" });
    mockPrisma.privateSource.findFirst.mockResolvedValue({
      id: "conn-1",
      userId: "user-1",
      status: "SYNCING",
      credentials: "encrypted",
    });

    const response = await POST(createRequest(), createParams("conn-1"));

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toBe("Sync already in progress");
  });

  it("returns 400 when connector is disconnected", async () => {
    mockGetCurrentUser.mockResolvedValue({ userId: "user-1" });
    mockPrisma.privateSource.findFirst.mockResolvedValue({
      id: "conn-1",
      userId: "user-1",
      status: "DISCONNECTED",
      credentials: null,
    });

    const response = await POST(createRequest(), createParams("conn-1"));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("Connector is not connected");
  });

  it("allows sync when credentials are null (public mode)", async () => {
    const source = {
      id: "conn-1",
      userId: "user-1",
      type: "LINKEDIN",
      status: "CONNECTED",
      credentials: null,
      config: { profiles: [{ publicId: "test", name: "Test" }] },
    };
    mockGetCurrentUser.mockResolvedValue({ userId: "user-1" });
    mockPrisma.privateSource.findFirst.mockResolvedValue(source);
    mockPrisma.privateSource.update.mockResolvedValue({});
    mockGetConnector.mockResolvedValue({
      fetchItems: vi.fn().mockResolvedValue([]),
    });

    const response = await POST(createRequest(), createParams("conn-1"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.totalFetched).toBe(0);
  });

  it("returns 200 with sync results on success", async () => {
    const source = {
      id: "conn-1",
      userId: "user-1",
      type: "GMAIL",
      status: "CONNECTED",
      credentials: "encrypted",
      config: { senders: [] },
    };
    mockGetCurrentUser.mockResolvedValue({ userId: "user-1" });
    mockPrisma.privateSource.findFirst.mockResolvedValue(source);
    mockPrisma.privateSource.update.mockResolvedValue({});
    mockGetConnector.mockResolvedValue({
      fetchItems: vi.fn().mockResolvedValue([
        {
          url: "https://example.com/1",
          title: "Article 1",
          author: "Author 1",
          publishedAt: new Date(),
          externalId: "ext-1",
        },
        {
          url: "https://example.com/2",
          title: "Article 2",
          author: "Author 2",
          publishedAt: new Date(),
          externalId: "ext-2",
        },
      ]),
    });
    // First article is new, second already exists
    mockPrisma.article.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "existing" });
    mockPrisma.article.create.mockResolvedValue({ id: "new-article-1" });

    const response = await POST(createRequest(), createParams("conn-1"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.newArticles).toBe(1);
    expect(body.totalFetched).toBe(2);

    // Should have marked as SYNCING, then CONNECTED
    expect(mockPrisma.privateSource.update).toHaveBeenCalledTimes(2);
  });

  it("handles sync errors by setting status to ERROR", async () => {
    const source = {
      id: "conn-1",
      userId: "user-1",
      type: "GMAIL",
      status: "CONNECTED",
      credentials: "encrypted",
      config: {},
    };
    mockGetCurrentUser.mockResolvedValue({ userId: "user-1" });
    mockPrisma.privateSource.findFirst.mockResolvedValue(source);
    mockPrisma.privateSource.update.mockResolvedValue({});
    mockGetConnector.mockResolvedValue({
      fetchItems: vi.fn().mockRejectedValue(new Error("API rate limit")),
    });

    const response = await POST(createRequest(), createParams("conn-1"));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("API rate limit");

    // Should update to ERROR status
    expect(mockPrisma.privateSource.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "ERROR",
          lastSyncError: "API rate limit",
        }),
      })
    );
  });

  it("handles non-Error sync failures", async () => {
    const source = {
      id: "conn-1",
      userId: "user-1",
      type: "GMAIL",
      status: "CONNECTED",
      credentials: "encrypted",
      config: {},
    };
    mockGetCurrentUser.mockResolvedValue({ userId: "user-1" });
    mockPrisma.privateSource.findFirst.mockResolvedValue(source);
    mockPrisma.privateSource.update.mockResolvedValue({});
    mockGetConnector.mockResolvedValue({
      fetchItems: vi.fn().mockRejectedValue("string error"),
    });

    const response = await POST(createRequest(), createParams("conn-1"));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Sync failed");
  });

  it("returns 200 when no items are fetched", async () => {
    const source = {
      id: "conn-1",
      userId: "user-1",
      type: "GMAIL",
      status: "CONNECTED",
      credentials: "encrypted",
      config: { lastSyncMessageId: "old-id" },
    };
    mockGetCurrentUser.mockResolvedValue({ userId: "user-1" });
    mockPrisma.privateSource.findFirst.mockResolvedValue(source);
    mockPrisma.privateSource.update.mockResolvedValue({});
    mockGetConnector.mockResolvedValue({
      fetchItems: vi.fn().mockResolvedValue([]),
    });

    const response = await POST(createRequest(), createParams("conn-1"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.newArticles).toBe(0);
    expect(body.totalFetched).toBe(0);
  });

  it("returns 500 on outer catch (e.g. getCurrentUser throws)", async () => {
    mockGetCurrentUser.mockRejectedValue(new Error("Session error"));

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(createRequest(), createParams());

    expect(response.status).toBe(500);

    spy.mockRestore();
  });
});
