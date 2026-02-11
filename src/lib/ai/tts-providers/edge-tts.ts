/**
 * Edge TTS adapter
 */

import { EdgeTTS } from "edge-tts-universal";
import type { TTSProvider } from "@/lib/ai/tts";
import { isValidVoice, DEFAULT_TTS_VOICE } from "@/lib/config";

export class EdgeTTSProvider implements TTSProvider {
  async synthesize(text: string, voice: string): Promise<ArrayBuffer> {
    const selectedVoice = isValidVoice(voice) ? voice : DEFAULT_TTS_VOICE;
    const tts = new EdgeTTS(text, selectedVoice);
    const result = await tts.synthesize();
    return result.audio.arrayBuffer();
  }
}
