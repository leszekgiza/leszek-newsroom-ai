// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock the LLM provider module
// ---------------------------------------------------------------------------
const mockGenerateText = vi.fn();

vi.mock("@/lib/ai/llm", () => ({
  getLLMProvider: vi.fn().mockResolvedValue({
    generateText: mockGenerateText,
  }),
}));

import { getLLMProvider } from "@/lib/ai/llm";

// ---------------------------------------------------------------------------
// generatePolishIntro
// ---------------------------------------------------------------------------
describe("generatePolishIntro", () => {
  let generatePolishIntro: typeof import("../aiService").generatePolishIntro;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Re-import to get a fresh module
    vi.resetModules();

    // Re-apply mock after resetModules
    vi.doMock("@/lib/ai/llm", () => ({
      getLLMProvider: vi.fn().mockResolvedValue({
        generateText: mockGenerateText,
      }),
    }));

    const mod = await import("../aiService");
    generatePolishIntro = mod.generatePolishIntro;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns generated intro text on success", async () => {
    mockGenerateText.mockResolvedValue(
      "Technologia blockchain zmienia sektor finansowy. Nowe rozwiazania pozwalaja na szybsze transakcje."
    );

    const result = await generatePolishIntro(
      "Blockchain in Finance",
      "Article content about blockchain technology..."
    );

    expect(result).toBe(
      "Technologia blockchain zmienia sektor finansowy. Nowe rozwiazania pozwalaja na szybsze transakcje."
    );
  });

  it("returns empty string on LLM error", async () => {
    mockGenerateText.mockRejectedValue(new Error("API rate limit exceeded"));

    const result = await generatePolishIntro(
      "Test Title",
      "Some content"
    );

    expect(result).toBe("");
  });

  it("truncates content to 3000 characters before sending to LLM", async () => {
    const longContent = "A".repeat(5000);
    mockGenerateText.mockResolvedValue("Krotkie wprowadzenie.");

    await generatePolishIntro("Title", longContent);

    // The prompt should contain the truncated content (3000 chars), not the full 5000
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    const prompt = mockGenerateText.mock.calls[0][0] as string;
    // The full 5000-char content should NOT appear in the prompt
    expect(prompt).not.toContain("A".repeat(5000));
    // But 3000 chars of it should
    expect(prompt).toContain("A".repeat(3000));
  });

  it("passes correct prompt structure to LLM", async () => {
    mockGenerateText.mockResolvedValue("Wprowadzenie testowe.");

    await generatePolishIntro("My Article Title", "Some article content here");

    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    const prompt = mockGenerateText.mock.calls[0][0] as string;

    // Check that prompt contains the title and content
    expect(prompt).toContain("My Article Title");
    expect(prompt).toContain("Some article content here");

    // Check that prompt contains key Polish instructions
    expect(prompt).toContain("2 zdania");
    expect(prompt).toContain("polskim");
    expect(prompt).toContain("TYTUL:");
    expect(prompt).toContain("TRESC:");
    expect(prompt).toContain("ZASADY:");
  });

  it("passes maxTokens option to LLM generateText", async () => {
    mockGenerateText.mockResolvedValue("Wynik.");

    await generatePolishIntro("Title", "Content");

    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.any(String),
      { maxTokens: 200 }
    );
  });

  it("calls getLLMProvider to obtain the provider instance", async () => {
    mockGenerateText.mockResolvedValue("Intro.");

    // Re-import to get the mocked getLLMProvider reference
    const { getLLMProvider: mockedGetProvider } = await import("@/lib/ai/llm");

    await generatePolishIntro("Title", "Content");

    expect(mockedGetProvider).toHaveBeenCalled();
  });

  it("returns empty string when getLLMProvider throws", async () => {
    // Override the mock to make getLLMProvider itself throw
    vi.resetModules();
    vi.doMock("@/lib/ai/llm", () => ({
      getLLMProvider: vi.fn().mockRejectedValue(new Error("No API key configured")),
    }));

    const mod = await import("../aiService");

    const result = await mod.generatePolishIntro("Title", "Content");
    expect(result).toBe("");
  });

  it("does not truncate content shorter than 3000 characters", async () => {
    const shortContent = "Short article content that is well under the limit.";
    mockGenerateText.mockResolvedValue("Wprowadzenie.");

    await generatePolishIntro("Title", shortContent);

    const prompt = mockGenerateText.mock.calls[0][0] as string;
    expect(prompt).toContain(shortContent);
  });
});
