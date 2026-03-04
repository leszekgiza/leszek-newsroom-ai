import { describe, it, expect, vi, beforeEach } from "vitest";
import { validateWaitlistEmail } from "../waitlistService";

// Mock prisma
vi.mock("../prisma", () => ({
  prisma: {
    waitlistSignup: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

describe("waitlistService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validateWaitlistEmail", () => {
    it("rejects empty email", () => {
      expect(validateWaitlistEmail("")).toEqual({
        valid: false,
        error: "Email is required",
      });
    });

    it("rejects invalid email format", () => {
      expect(validateWaitlistEmail("notanemail")).toEqual({
        valid: false,
        error: "Invalid email format",
      });
    });

    it("rejects email without @", () => {
      expect(validateWaitlistEmail("test.example.com")).toEqual({
        valid: false,
        error: "Invalid email format",
      });
    });

    it("accepts valid email", () => {
      expect(validateWaitlistEmail("test@example.com")).toEqual({
        valid: true,
      });
    });

    it("accepts email with subdomains", () => {
      expect(validateWaitlistEmail("user@mail.example.co.uk")).toEqual({
        valid: true,
      });
    });

    it("rejects email longer than 320 chars", () => {
      const longEmail = "a".repeat(310) + "@example.com";
      expect(validateWaitlistEmail(longEmail)).toEqual({
        valid: false,
        error: "Invalid email format",
      });
    });
  });
});
