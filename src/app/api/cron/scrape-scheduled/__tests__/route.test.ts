// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockIsPremiumEnabled, mockRunScheduledSync } = vi.hoisted(() => ({
  mockIsPremiumEnabled: vi.fn(),
  mockRunScheduledSync: vi.fn(),
}));

vi.mock("@/lib/featureFlags", () => ({
  isPremiumEnabled: () => mockIsPremiumEnabled(),
}));

vi.mock("@/premium/lib/scheduledSyncService", () => ({
  runScheduledSync: () => mockRunScheduledSync(),
}));

import { GET, POST } from "../route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createRequest(method = "GET", authHeader?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (authHeader) headers["authorization"] = authHeader;

  return new NextRequest(
    "http://localhost:3005/api/cron/scrape-scheduled",
    { method, headers }
  );
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const originalEnv = process.env;

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...originalEnv };
  mockIsPremiumEnabled.mockReturnValue(true);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/cron/scrape-scheduled", () => {
  it("returns 404 when premium is not enabled", async () => {
    mockIsPremiumEnabled.mockReturnValue(false);

    const response = await GET(createRequest("GET", "Bearer secret"));

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe("Premium feature not enabled");
  });

  it("returns 401 when CRON_SECRET is set and auth header is missing", async () => {
    process.env.CRON_SECRET = "my-secret";

    const response = await GET(createRequest("GET"));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 401 when CRON_SECRET is set and auth header does not match", async () => {
    process.env.CRON_SECRET = "my-secret";

    const response = await GET(createRequest("GET", "Bearer wrong"));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 200 with sync results when authorized and premium enabled", async () => {
    process.env.CRON_SECRET = "my-secret";
    mockRunScheduledSync.mockResolvedValue({
      synced: 3,
      users: 2,
    });

    const response = await GET(
      createRequest("GET", "Bearer my-secret")
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.synced).toBe(3);
    expect(body.users).toBe(2);
    expect(body.timestamp).toBeDefined();
  });

  it("returns 200 when CRON_SECRET is not set (no auth required)", async () => {
    delete process.env.CRON_SECRET;
    mockRunScheduledSync.mockResolvedValue({ synced: 1, users: 1 });

    const response = await GET(createRequest("GET"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.synced).toBe(1);
  });

  it("returns 500 when runScheduledSync throws", async () => {
    delete process.env.CRON_SECRET;
    mockRunScheduledSync.mockRejectedValue(new Error("Sync failed"));

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(createRequest("GET"));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Failed to run scheduled sync");

    spy.mockRestore();
  });
});

describe("POST /api/cron/scrape-scheduled", () => {
  it("delegates to GET handler", async () => {
    delete process.env.CRON_SECRET;
    mockRunScheduledSync.mockResolvedValue({ synced: 5, users: 3 });

    const response = await POST(createRequest("POST"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.synced).toBe(5);
  });
});
