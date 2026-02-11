/**
 * Centralized configuration for LLM and TTS providers
 */

export interface TTSVoice {
  id: string;
  name: string;
  language: string;
  gender: "male" | "female";
}

export const TTS_VOICES: TTSVoice[] = [
  { id: "pl-PL-MarekNeural", name: "Marek", language: "pl-PL", gender: "male" },
  { id: "pl-PL-ZofiaNeural", name: "Zofia", language: "pl-PL", gender: "female" },
  { id: "en-US-GuyNeural", name: "Guy", language: "en-US", gender: "male" },
  { id: "en-US-JennyNeural", name: "Jenny", language: "en-US", gender: "female" },
];

export const DEFAULT_TTS_VOICE = "pl-PL-MarekNeural";

export function isValidVoice(voice: string): boolean {
  return TTS_VOICES.some((v) => v.id === voice);
}

export interface AppConfig {
  llm: {
    provider: string;
    model: string;
    apiKey: string;
  };
  tts: {
    provider: string;
  };
  gmail: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  };
  encryption: {
    credentialsKey: string;
  };
}

export function getConfig(): AppConfig {
  return {
    llm: {
      provider: process.env.LLM_PROVIDER || "anthropic",
      model: process.env.LLM_MODEL || "claude-sonnet-4-20250514",
      apiKey: process.env.ANTHROPIC_API_KEY || "",
    },
    tts: {
      provider: process.env.TTS_PROVIDER || "edge-tts",
    },
    gmail: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      redirectUri:
        process.env.GOOGLE_REDIRECT_URI ||
        "http://localhost:3000/api/auth/google/callback",
    },
    encryption: {
      credentialsKey: process.env.CREDENTIALS_ENCRYPTION_KEY || "",
    },
  };
}
