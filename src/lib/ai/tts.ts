/**
 * TTS Provider interface and factory
 */

import { getConfig } from "@/lib/config";

export interface TTSProvider {
  synthesize(text: string, voice: string): Promise<ArrayBuffer>;
}

let cachedProvider: TTSProvider | null = null;

export async function getTTSProvider(): Promise<TTSProvider> {
  if (cachedProvider) return cachedProvider;

  const config = getConfig();

  switch (config.tts.provider) {
    case "edge-tts": {
      const { EdgeTTSProvider } = await import("@/lib/ai/tts-providers/edge-tts");
      cachedProvider = new EdgeTTSProvider();
      break;
    }
    default:
      throw new Error(`Unknown TTS provider: ${config.tts.provider}`);
  }

  return cachedProvider!;
}
