// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Static exports (TTS_VOICES, DEFAULT_TTS_VOICE, isValidVoice)
// These do not depend on env vars, so a single import suffices.
// ---------------------------------------------------------------------------
import {
  TTS_VOICES,
  DEFAULT_TTS_VOICE,
  isValidVoice,
} from "../config";

describe("TTS_VOICES", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(TTS_VOICES)).toBe(true);
    expect(TTS_VOICES.length).toBeGreaterThan(0);
  });

  it("each voice has required fields (id, name, language, gender)", () => {
    for (const voice of TTS_VOICES) {
      expect(voice).toHaveProperty("id");
      expect(voice).toHaveProperty("name");
      expect(voice).toHaveProperty("language");
      expect(voice).toHaveProperty("gender");
      expect(typeof voice.id).toBe("string");
      expect(typeof voice.name).toBe("string");
      expect(typeof voice.language).toBe("string");
      expect(["male", "female"]).toContain(voice.gender);
    }
  });
});

describe("DEFAULT_TTS_VOICE", () => {
  it("is included in TTS_VOICES", () => {
    const voiceIds = TTS_VOICES.map((v) => v.id);
    expect(voiceIds).toContain(DEFAULT_TTS_VOICE);
  });

  it("is a non-empty string", () => {
    expect(typeof DEFAULT_TTS_VOICE).toBe("string");
    expect(DEFAULT_TTS_VOICE.length).toBeGreaterThan(0);
  });
});

describe("isValidVoice", () => {
  it("returns true for a valid voice id", () => {
    expect(isValidVoice("pl-PL-MarekNeural")).toBe(true);
  });

  it("returns true for each voice in TTS_VOICES", () => {
    for (const voice of TTS_VOICES) {
      expect(isValidVoice(voice.id)).toBe(true);
    }
  });

  it("returns false for an invalid voice id", () => {
    expect(isValidVoice("nonexistent-voice")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidVoice("")).toBe(false);
  });

  it("is case-sensitive", () => {
    // Valid id in wrong case should not match
    expect(isValidVoice("PL-PL-MAREKNEURAL")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getConfig — depends on process.env, so we use dynamic imports
// ---------------------------------------------------------------------------
async function loadModule() {
  vi.resetModules();
  return import("../config");
}

describe("getConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns config object with expected shape", async () => {
    const { getConfig } = await loadModule();
    const config = getConfig();

    expect(config).toHaveProperty("llm");
    expect(config).toHaveProperty("tts");
    expect(config).toHaveProperty("gmail");
    expect(config).toHaveProperty("encryption");

    expect(config.llm).toHaveProperty("provider");
    expect(config.llm).toHaveProperty("model");
    expect(config.llm).toHaveProperty("apiKey");
    expect(config.tts).toHaveProperty("provider");
    expect(config.gmail).toHaveProperty("clientId");
    expect(config.gmail).toHaveProperty("clientSecret");
    expect(config.gmail).toHaveProperty("redirectUri");
    expect(config.encryption).toHaveProperty("credentialsKey");
  });

  it("uses default values when env vars are not set", async () => {
    // Clear all relevant env vars
    vi.stubEnv("LLM_PROVIDER", "");
    vi.stubEnv("LLM_MODEL", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("TTS_PROVIDER", "");
    vi.stubEnv("GOOGLE_CLIENT_ID", "");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "");
    vi.stubEnv("GOOGLE_REDIRECT_URI", "");
    vi.stubEnv("CREDENTIALS_ENCRYPTION_KEY", "");

    const { getConfig } = await loadModule();
    const config = getConfig();

    expect(config.llm.provider).toBe("anthropic");
    expect(config.llm.model).toBe("claude-sonnet-4-20250514");
    expect(config.llm.apiKey).toBe("");
    expect(config.tts.provider).toBe("edge-tts");
    expect(config.gmail.clientId).toBe("");
    expect(config.gmail.clientSecret).toBe("");
    expect(config.gmail.redirectUri).toBe(
      "http://localhost:3000/api/auth/google/callback"
    );
    expect(config.encryption.credentialsKey).toBe("");
  });

  it("reads LLM config from env vars", async () => {
    vi.stubEnv("LLM_PROVIDER", "openai");
    vi.stubEnv("LLM_MODEL", "gpt-4o");
    vi.stubEnv("ANTHROPIC_API_KEY", "sk-test-key-123");

    const { getConfig } = await loadModule();
    const config = getConfig();

    expect(config.llm.provider).toBe("openai");
    expect(config.llm.model).toBe("gpt-4o");
    expect(config.llm.apiKey).toBe("sk-test-key-123");
  });

  it("reads TTS config from env vars", async () => {
    vi.stubEnv("TTS_PROVIDER", "azure-tts");

    const { getConfig } = await loadModule();
    const config = getConfig();

    expect(config.tts.provider).toBe("azure-tts");
  });

  it("reads Gmail config from env vars", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "client-id-123");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "client-secret-456");
    vi.stubEnv("GOOGLE_REDIRECT_URI", "https://example.com/callback");

    const { getConfig } = await loadModule();
    const config = getConfig();

    expect(config.gmail.clientId).toBe("client-id-123");
    expect(config.gmail.clientSecret).toBe("client-secret-456");
    expect(config.gmail.redirectUri).toBe("https://example.com/callback");
  });

  it("reads encryption config from env vars", async () => {
    vi.stubEnv("CREDENTIALS_ENCRYPTION_KEY", "my-secret-key-32bytes");

    const { getConfig } = await loadModule();
    const config = getConfig();

    expect(config.encryption.credentialsKey).toBe("my-secret-key-32bytes");
  });

  it("returns fresh values on each call (not cached)", async () => {
    const { getConfig } = await loadModule();

    vi.stubEnv("LLM_PROVIDER", "provider-a");
    const config1 = getConfig();
    expect(config1.llm.provider).toBe("provider-a");

    vi.stubEnv("LLM_PROVIDER", "provider-b");
    const config2 = getConfig();
    expect(config2.llm.provider).toBe("provider-b");
  });
});
