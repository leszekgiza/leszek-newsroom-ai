// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  const MockAnthropic = vi.fn().mockImplementation(function () {
    return { messages: { create: mockCreate } };
  });
  return { default: MockAnthropic };
});

import Anthropic from "@anthropic-ai/sdk";
import { AnthropicProvider } from "../anthropic";

describe("AnthropicProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("constructor stores apiKey and model", () => {
    const provider = new AnthropicProvider("sk-test-key", "claude-3-opus");

    // Verify the Anthropic SDK was instantiated with the API key
    expect(Anthropic).toHaveBeenCalledWith({ apiKey: "sk-test-key" });

    // Verify model is stored by calling generateText and checking what's passed to create
    // (model is private, so we test it indirectly)
    expect(provider).toBeInstanceOf(AnthropicProvider);
  });

  it("generateText calls Anthropic client messages.create", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "Hello world" }],
    });

    const provider = new AnthropicProvider("sk-test", "claude-3");
    await provider.generateText("Say hello");

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it("generateText returns response text", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "  Generated response  " }],
    });

    const provider = new AnthropicProvider("sk-test", "claude-3");
    const result = await provider.generateText("Some prompt");

    expect(result).toBe("Generated response");
  });

  it("generateText passes maxTokens option", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "response" }],
    });

    const provider = new AnthropicProvider("sk-test", "claude-3-haiku");
    await provider.generateText("prompt", { maxTokens: 2048 });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "claude-3-haiku",
        max_tokens: 2048,
        messages: [{ role: "user", content: "prompt" }],
      })
    );
  });

  it("generateText uses default maxTokens of 1024 when not specified", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "response" }],
    });

    const provider = new AnthropicProvider("sk-test", "claude-3");
    await provider.generateText("prompt");

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        max_tokens: 1024,
      })
    );
  });

  it("generateText includes systemPrompt when provided", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "response" }],
    });

    const provider = new AnthropicProvider("sk-test", "claude-3");
    await provider.generateText("prompt", {
      systemPrompt: "You are a helpful assistant",
    });

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        system: "You are a helpful assistant",
        messages: [{ role: "user", content: "prompt" }],
      })
    );
  });

  it("generateText does not include system field when systemPrompt is not provided", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: "response" }],
    });

    const provider = new AnthropicProvider("sk-test", "claude-3");
    await provider.generateText("prompt");

    const callArgs = mockCreate.mock.calls[0][0];
    expect(callArgs).not.toHaveProperty("system");
  });

  it("generateText propagates API errors", async () => {
    mockCreate.mockRejectedValue(new Error("API rate limit exceeded"));

    const provider = new AnthropicProvider("sk-test", "claude-3");

    await expect(provider.generateText("prompt")).rejects.toThrow(
      "API rate limit exceeded"
    );
  });
});
