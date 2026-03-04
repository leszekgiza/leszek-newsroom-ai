import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock jose before importing middleware
vi.mock("jose", () => ({
  jwtVerify: vi.fn(),
}));

import { jwtVerify } from "jose";
import {
  parseAcceptLanguage,
  getMiddlewareAction,
  type MiddlewareAction,
} from "../middleware-utils";

const mockedJwtVerify = vi.mocked(jwtVerify);

describe("parseAcceptLanguage", () => {
  it("returns default locale for empty header", () => {
    expect(parseAcceptLanguage("")).toBe("pl");
  });

  it("returns default locale for undefined", () => {
    expect(parseAcceptLanguage(undefined)).toBe("pl");
  });

  it("detects Polish", () => {
    expect(parseAcceptLanguage("pl-PL,pl;q=0.9,en;q=0.8")).toBe("pl");
  });

  it("detects English", () => {
    expect(parseAcceptLanguage("en-US,en;q=0.9")).toBe("en");
  });

  it("detects German", () => {
    expect(parseAcceptLanguage("de-DE,de;q=0.9,en;q=0.5")).toBe("de");
  });

  it("detects Arabic", () => {
    expect(parseAcceptLanguage("ar-SA,ar;q=0.9")).toBe("ar");
  });

  it("falls back to default for unsupported language", () => {
    expect(parseAcceptLanguage("ja-JP,ja;q=0.9")).toBe("pl");
  });

  it("picks highest priority supported language", () => {
    expect(parseAcceptLanguage("ja;q=0.9,fr;q=0.8,en;q=0.7")).toBe("fr");
  });
});

describe("getMiddlewareAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("pass through for API routes", async () => {
    const action = await getMiddlewareAction("/api/articles", null, "");
    expect(action.type).toBe("passthrough");
  });

  it("pass through for auth routes", async () => {
    const login = await getMiddlewareAction("/login", null, "");
    expect(login.type).toBe("passthrough");
    const register = await getMiddlewareAction("/register", null, "");
    expect(register.type).toBe("passthrough");
  });

  it("pass through for static assets", async () => {
    const action = await getMiddlewareAction("/_next/static/chunk.js", null, "");
    expect(action.type).toBe("passthrough");
  });

  it("redirects / to /[locale] for unauthenticated users", async () => {
    const action = await getMiddlewareAction("/", null, "en-US,en;q=0.9");
    expect(action.type).toBe("redirect");
    expect((action as MiddlewareAction & { url: string }).url).toBe("/en");
  });

  it("redirects / to /pl for unauthenticated users with no Accept-Language", async () => {
    const action = await getMiddlewareAction("/", null, "");
    expect(action.type).toBe("redirect");
    expect((action as MiddlewareAction & { url: string }).url).toBe("/pl");
  });

  it("passes through / for authenticated users", async () => {
    mockedJwtVerify.mockResolvedValueOnce({
      payload: { userId: "user1" },
      protectedHeader: { alg: "HS256" },
      key: new Uint8Array(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const action = await getMiddlewareAction("/", "valid-token", "");
    expect(action.type).toBe("passthrough");
  });

  it("serves landing page for /pl when unauthenticated", async () => {
    const action = await getMiddlewareAction("/pl", null, "");
    expect(action.type).toBe("passthrough");
  });

  it("serves landing page for /en when unauthenticated", async () => {
    const action = await getMiddlewareAction("/en", null, "");
    expect(action.type).toBe("passthrough");
  });

  it("redirects /pl to / for authenticated users", async () => {
    mockedJwtVerify.mockResolvedValueOnce({
      payload: { userId: "user1" },
      protectedHeader: { alg: "HS256" },
      key: new Uint8Array(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const action = await getMiddlewareAction("/pl", "valid-token", "");
    expect(action.type).toBe("redirect");
    expect((action as MiddlewareAction & { url: string }).url).toBe("/");
  });

  it("redirects /en to / for authenticated users", async () => {
    mockedJwtVerify.mockResolvedValueOnce({
      payload: { userId: "user1" },
      protectedHeader: { alg: "HS256" },
      key: new Uint8Array(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const action = await getMiddlewareAction("/en", "valid-token", "");
    expect(action.type).toBe("redirect");
    expect((action as MiddlewareAction & { url: string }).url).toBe("/");
  });

  it("treats expired token as unauthenticated", async () => {
    mockedJwtVerify.mockRejectedValueOnce(new Error("token expired"));
    const action = await getMiddlewareAction("/", "expired-token", "pl");
    expect(action.type).toBe("redirect");
  });
});
