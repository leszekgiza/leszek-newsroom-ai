// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

function createAnthropicMock() {
  return {
    AnthropicProvider: vi.fn().mockImplementation(function (apiKey: string, model: string) {
      return {
        _type: "anthropic",
        apiKey,
        model,
        generateText: vi.fn(),
      };
    }),
  };
}

async function loadModule() {
  vi.resetModules();
  vi.doMock("@/lib/config", () => ({
    getConfig: vi.fn(),
  }));
  vi.doMock("@/lib/ai/providers/anthropic", () => createAnthropicMock());
  const configMod = await import("@/lib/config");
  const llmMod = await import("@/lib/ai/llm");
  return { configMod, llmMod };
}

function makeConfig(overrides: Record<string, unknown> = {}) {
  return {
    llm: { provider: "anthropic", apiKey: "sk-test", model: "claude-3", ...overrides },
    tts: { provider: "edge-tts" },
    gmail: { clientId: "", clientSecret: "", redirectUri: "" },
    encryption: { credentialsKey: "" },
  };
}

describe("getLLMProvider", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns an LLM provider instance", async () => {
    const { configMod, llmMod } = await loadModule();
    vi.mocked(configMod.getConfig).mockReturnValue(makeConfig());

    const provider = await llmMod.getLLMProvider();
    expect(provider).toBeDefined();
    expect(provider).toHaveProperty("generateText");
  });

  it("caches the provider — second call returns same instance", async () => {
    const { configMod, llmMod } = await loadModule();
    vi.mocked(configMod.getConfig).mockReturnValue(makeConfig());

    const provider1 = await llmMod.getLLMProvider();
    const provider2 = await llmMod.getLLMProvider();
    expect(provider1).toBe(provider2);
  });

  it("passes apiKey and model from config to provider", async () => {
    const { configMod, llmMod } = await loadModule();
    vi.mocked(configMod.getConfig).mockReturnValue(
      makeConfig({ apiKey: "sk-my-key-123", model: "claude-opus-4" })
    );

    const provider = await llmMod.getLLMProvider();
    const { AnthropicProvider } = await import("@/lib/ai/providers/anthropic");

    expect(AnthropicProvider).toHaveBeenCalledWith("sk-my-key-123", "claude-opus-4");
    expect((provider as unknown as { apiKey: string }).apiKey).toBe("sk-my-key-123");
    expect((provider as unknown as { model: string }).model).toBe("claude-opus-4");
  });

  it("throws on unknown provider type", async () => {
    const { configMod, llmMod } = await loadModule();
    vi.mocked(configMod.getConfig).mockReturnValue(
      makeConfig({ provider: "unknown-provider" })
    );

    await expect(llmMod.getLLMProvider()).rejects.toThrow(
      "Unknown LLM provider: unknown-provider"
    );
  });
});
