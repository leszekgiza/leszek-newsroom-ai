// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cookies } from "next/headers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_JWT_SECRET = "test-jwt-secret-for-vitest-at-least-32-chars-long";

/** Mock cookie store that records calls */
function createMockCookieStore() {
  const store = new Map<string, string>();
  return {
    set: vi.fn((name: string, value: string, _opts?: unknown) => {
      store.set(name, value);
    }),
    get: vi.fn((name: string) => {
      const value = store.get(name);
      return value !== undefined ? { name, value } : undefined;
    }),
    delete: vi.fn((name: string) => {
      store.delete(name);
    }),
    _store: store,
  };
}

let mockCookieStore = createMockCookieStore();

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

const cookiesMock = vi.mocked(cookies);

async function loadModule() {
  vi.resetModules();
  return import("../auth");
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.stubEnv("JWT_SECRET", TEST_JWT_SECRET);
  mockCookieStore = createMockCookieStore();
  cookiesMock.mockResolvedValue(mockCookieStore as never);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------------------
// hashPassword
// ---------------------------------------------------------------------------
describe("hashPassword", () => {
  it("returns a bcrypt hash starting with $2", async () => {
    const { hashPassword } = await loadModule();
    const hash = await hashPassword("mysecretpassword");
    expect(hash).toMatch(/^\$2[aby]?\$/);
  });

  it("produces different hashes for the same input (salt)", async () => {
    const { hashPassword } = await loadModule();
    const hash1 = await hashPassword("password");
    const hash2 = await hashPassword("password");
    expect(hash1).not.toBe(hash2);
  });
});

// ---------------------------------------------------------------------------
// verifyPassword
// ---------------------------------------------------------------------------
describe("verifyPassword", () => {
  it("returns true for correct password", async () => {
    const { hashPassword, verifyPassword } = await loadModule();
    const hash = await hashPassword("correctpassword");
    const result = await verifyPassword("correctpassword", hash);
    expect(result).toBe(true);
  });

  it("returns false for wrong password", async () => {
    const { hashPassword, verifyPassword } = await loadModule();
    const hash = await hashPassword("correctpassword");
    const result = await verifyPassword("wrongpassword", hash);
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createToken
// ---------------------------------------------------------------------------
describe("createToken", () => {
  it("returns a valid JWT string (3 dot-separated parts)", async () => {
    const { createToken } = await loadModule();
    const token = await createToken("user-123");
    const parts = token.split(".");
    expect(parts).toHaveLength(3);
    for (const part of parts) {
      expect(part.length).toBeGreaterThan(0);
    }
  });

  it("embeds the userId in the token payload", async () => {
    const { createToken, verifyToken } = await loadModule();
    const token = await createToken("user-456");
    const payload = await verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.userId).toBe("user-456");
  });
});

// ---------------------------------------------------------------------------
// verifyToken
// ---------------------------------------------------------------------------
describe("verifyToken", () => {
  it("decodes a token created by createToken", async () => {
    const { createToken, verifyToken } = await loadModule();
    const token = await createToken("user-789");
    const payload = await verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.userId).toBe("user-789");
  });

  it("returns null for an invalid token", async () => {
    const { verifyToken } = await loadModule();
    const payload = await verifyToken("not.a.valid.token");
    expect(payload).toBeNull();
  });

  it("returns null for a completely garbage string", async () => {
    const { verifyToken } = await loadModule();
    const payload = await verifyToken("garbage");
    expect(payload).toBeNull();
  });

  it("returns null for a token signed with a different secret", async () => {
    // Create a token with current secret
    const { createToken } = await loadModule();
    const token = await createToken("user-111");

    // Now change the secret and try to verify
    vi.stubEnv("JWT_SECRET", "completely-different-secret-at-least-32-chars");
    const { verifyToken } = await loadModule();
    const payload = await verifyToken(token);
    expect(payload).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// setSessionCookie
// ---------------------------------------------------------------------------
describe("setSessionCookie", () => {
  it("calls cookies().set with correct parameters", async () => {
    const { setSessionCookie } = await loadModule();
    await setSessionCookie("my-token-value");

    expect(mockCookieStore.set).toHaveBeenCalledTimes(1);
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "session",
      "my-token-value",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      })
    );
  });

  it("sets maxAge based on 7 day SESSION_DURATION", async () => {
    const { setSessionCookie } = await loadModule();
    await setSessionCookie("token");

    const callArgs = mockCookieStore.set.mock.calls[0];
    const options = callArgs[2] as { maxAge: number };
    // 7 days in seconds = 7 * 24 * 60 * 60 = 604800
    expect(options.maxAge).toBe(604800);
  });

  it("sets secure=false when NODE_ENV is not production", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const { setSessionCookie } = await loadModule();
    await setSessionCookie("token");

    const callArgs = mockCookieStore.set.mock.calls[0];
    const options = callArgs[2] as { secure: boolean };
    expect(options.secure).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getSessionCookie
// ---------------------------------------------------------------------------
describe("getSessionCookie", () => {
  it("returns the token value from cookies", async () => {
    mockCookieStore._store.set("session", "stored-token");
    const { getSessionCookie } = await loadModule();
    const value = await getSessionCookie();
    expect(value).toBe("stored-token");
  });

  it("returns null when no session cookie exists", async () => {
    const { getSessionCookie } = await loadModule();
    const value = await getSessionCookie();
    expect(value).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// clearSessionCookie
// ---------------------------------------------------------------------------
describe("clearSessionCookie", () => {
  it("calls cookies().delete with 'session'", async () => {
    const { clearSessionCookie } = await loadModule();
    await clearSessionCookie();

    expect(mockCookieStore.delete).toHaveBeenCalledTimes(1);
    expect(mockCookieStore.delete).toHaveBeenCalledWith("session");
  });
});

// ---------------------------------------------------------------------------
// getCurrentUser
// ---------------------------------------------------------------------------
describe("getCurrentUser", () => {
  it("returns the decoded payload when a valid session cookie exists", async () => {
    const { createToken, getCurrentUser } = await loadModule();
    const token = await createToken("user-current");
    mockCookieStore._store.set("session", token);

    const user = await getCurrentUser();
    expect(user).not.toBeNull();
    expect(user!.userId).toBe("user-current");
  });

  it("returns null when no session cookie exists", async () => {
    const { getCurrentUser } = await loadModule();
    const user = await getCurrentUser();
    expect(user).toBeNull();
  });

  it("returns null when session cookie contains an invalid token", async () => {
    mockCookieStore._store.set("session", "invalid-token");
    const { getCurrentUser } = await loadModule();
    const user = await getCurrentUser();
    expect(user).toBeNull();
  });
});
