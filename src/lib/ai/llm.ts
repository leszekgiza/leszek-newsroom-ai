/**
 * LLM Provider interface and factory
 */

import { getConfig } from "@/lib/config";

export interface LLMOptions {
  maxTokens?: number;
  systemPrompt?: string;
}

export interface LLMProvider {
  generateText(prompt: string, options?: LLMOptions): Promise<string>;
}

let cachedProvider: LLMProvider | null = null;

export async function getLLMProvider(): Promise<LLMProvider> {
  if (cachedProvider) return cachedProvider;

  const config = getConfig();

  switch (config.llm.provider) {
    case "anthropic": {
      const { AnthropicProvider } = await import("@/lib/ai/providers/anthropic");
      cachedProvider = new AnthropicProvider(config.llm.apiKey, config.llm.model);
      break;
    }
    default:
      throw new Error(`Unknown LLM provider: ${config.llm.provider}`);
  }

  return cachedProvider!;
}
