import { create } from "zustand";

type TTSVoice = "pl-PL-MarekNeural" | "pl-PL-ZofiaNeural" | "en-US-GuyNeural" | "en-US-JennyNeural";

interface PlayerState {
  isPlaying: boolean;
  currentArticleId: string | null;
  voice: TTSVoice;
  progress: number;
  duration: number;

  play: (articleId: string) => void;
  pause: () => void;
  stop: () => void;
  setVoice: (voice: TTSVoice) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  isPlaying: false,
  currentArticleId: null,
  voice: "pl-PL-MarekNeural",
  progress: 0,
  duration: 0,

  play: (articleId) =>
    set({
      isPlaying: true,
      currentArticleId: articleId,
      progress: 0,
    }),
  pause: () => set({ isPlaying: false }),
  stop: () =>
    set({
      isPlaying: false,
      currentArticleId: null,
      progress: 0,
      duration: 0,
    }),
  setVoice: (voice) => set({ voice }),
  setProgress: (progress) => set({ progress }),
  setDuration: (duration) => set({ duration }),
}));
