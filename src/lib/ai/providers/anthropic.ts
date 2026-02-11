/**
 * Anthropic Claude LLM adapter
 */

import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, LLMOptions } from "@/lib/ai/llm";

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async generateText(prompt: string, options?: LLMOptions): Promise<string> {
    const message = await this.client.messages.create({
      model: this.model,
      max_tokens: options?.maxTokens ?? 1024,
      ...(options?.systemPrompt ? { system: options.systemPrompt } : {}),
      messages: [{ role: "user", content: prompt }],
    });

    return (message.content[0] as { type: string; text: string }).text.trim();
  }
}
