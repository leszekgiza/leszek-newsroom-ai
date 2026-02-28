// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const TEST_KEY = "a".repeat(64); // 64 hex chars = 32 bytes

async function loadModule() {
  vi.resetModules();
  return import("../encryption");
}

beforeEach(() => {
  vi.stubEnv("CREDENTIALS_ENCRYPTION_KEY", TEST_KEY);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------------------
// encrypt
// ---------------------------------------------------------------------------
describe("encrypt", () => {
  it("returns string in iv:ciphertext:authTag format (3 colon-separated parts)", async () => {
    const { encrypt } = await loadModule();
    const result = encrypt("hello world");
    const parts = result.split(":");
    expect(parts).toHaveLength(3);
    // Each part should be non-empty base64
    for (const part of parts) {
      expect(part.length).toBeGreaterThan(0);
    }
  });

  it("produces different ciphertext each time (random IV)", async () => {
    const { encrypt } = await loadModule();
    const plaintext = "same input";
    const result1 = encrypt(plaintext);
    const result2 = encrypt(plaintext);
    expect(result1).not.toBe(result2);
  });

  it("handles empty string encryption", async () => {
    const { encrypt } = await loadModule();
    const result = encrypt("");
    const parts = result.split(":");
    expect(parts).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// decrypt
// ---------------------------------------------------------------------------
describe("decrypt", () => {
  it("roundtrip: decrypt(encrypt(plaintext)) === plaintext", async () => {
    const { encrypt, decrypt } = await loadModule();
    const plaintext = "The quick brown fox jumps over the lazy dog";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("handles empty string roundtrip", async () => {
    const { encrypt, decrypt } = await loadModule();
    const encrypted = encrypt("");
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe("");
  });

  it("throws on invalid format (missing parts)", async () => {
    const { decrypt } = await loadModule();
    expect(() => decrypt("onlyonepart")).toThrow(
      "Invalid encrypted format: expected iv:ciphertext:authTag"
    );
    expect(() => decrypt("two:parts")).toThrow(
      "Invalid encrypted format: expected iv:ciphertext:authTag"
    );
  });

  it("throws on tampered ciphertext", async () => {
    const { encrypt, decrypt } = await loadModule();
    const encrypted = encrypt("secret data");
    const parts = encrypted.split(":");
    // Tamper with the ciphertext (middle part)
    const tampered = Buffer.from(parts[1], "base64");
    tampered[0] = tampered[0] ^ 0xff;
    parts[1] = tampered.toString("base64");
    const tamperedStr = parts.join(":");
    expect(() => decrypt(tamperedStr)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// getKey (via encrypt/decrypt)
// ---------------------------------------------------------------------------
describe("getKey validation", () => {
  it("throws when CREDENTIALS_ENCRYPTION_KEY is empty", async () => {
    vi.stubEnv("CREDENTIALS_ENCRYPTION_KEY", "");
    const { encrypt } = await loadModule();
    expect(() => encrypt("test")).toThrow(
      "CREDENTIALS_ENCRYPTION_KEY must be set"
    );
  });

  it("throws when key is wrong length", async () => {
    vi.stubEnv("CREDENTIALS_ENCRYPTION_KEY", "abc123");
    const { encrypt } = await loadModule();
    expect(() => encrypt("test")).toThrow(
      "CREDENTIALS_ENCRYPTION_KEY must be set"
    );
  });
});
