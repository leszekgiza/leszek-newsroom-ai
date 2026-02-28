// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

function createEdgeTTSMock() {
  return {
    EdgeTTSProvider: vi.fn().mockImplementation(function () {
      return {
        _type: "edge-tts",
        synthesize: vi.fn(),
      };
    }),
  };
}

async function loadModule() {
  vi.resetModules();
  vi.doMock("@/lib/config", () => ({
    getConfig: vi.fn(),
  }));
  vi.doMock("@/lib/ai/tts-providers/edge-tts", () => createEdgeTTSMock());
  const configMod = await import("@/lib/config");
  const ttsMod = await import("@/lib/ai/tts");
  return { configMod, ttsMod };
}

function makeConfig(ttsProvider = "edge-tts") {
  return {
    llm: { provider: "anthropic", apiKey: "", model: "" },
    tts: { provider: ttsProvider },
    gmail: { clientId: "", clientSecret: "", redirectUri: "" },
    encryption: { credentialsKey: "" },
  };
}

describe("getTTSProvider", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns a TTS provider instance", async () => {
    const { configMod, ttsMod } = await loadModule();
    vi.mocked(configMod.getConfig).mockReturnValue(makeConfig());

    const provider = await ttsMod.getTTSProvider();
    expect(provider).toBeDefined();
    expect(provider).toHaveProperty("synthesize");
  });

  it("caches the provider — second call returns same instance", async () => {
    const { configMod, ttsMod } = await loadModule();
    vi.mocked(configMod.getConfig).mockReturnValue(makeConfig());

    const provider1 = await ttsMod.getTTSProvider();
    const provider2 = await ttsMod.getTTSProvider();
    expect(provider1).toBe(provider2);
  });

  it("throws on unknown provider type", async () => {
    const { configMod, ttsMod } = await loadModule();
    vi.mocked(configMod.getConfig).mockReturnValue(makeConfig("unknown-tts"));

    await expect(ttsMod.getTTSProvider()).rejects.toThrow(
      "Unknown TTS provider: unknown-tts"
    );
  });
});
