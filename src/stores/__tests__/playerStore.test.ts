import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/config", () => ({
  DEFAULT_TTS_VOICE: "pl-PL-MarekNeural",
}));

import { usePlayerStore } from "@/stores/playerStore";

const initialState = {
  isPlaying: false,
  currentArticleId: null,
  progress: 0,
  duration: 0,
  voice: "pl-PL-MarekNeural",
};

describe("playerStore", () => {
  beforeEach(() => {
    usePlayerStore.setState(initialState);
  });

  it("has correct initial state", () => {
    const state = usePlayerStore.getState();
    expect(state.isPlaying).toBe(false);
    expect(state.currentArticleId).toBeNull();
    expect(state.progress).toBe(0);
    expect(state.duration).toBe(0);
    expect(state.voice).toBe("pl-PL-MarekNeural");
  });

  it("play(articleId) sets isPlaying true and currentArticleId", () => {
    usePlayerStore.getState().play("article-42");
    const state = usePlayerStore.getState();
    expect(state.isPlaying).toBe(true);
    expect(state.currentArticleId).toBe("article-42");
  });

  it("pause() sets isPlaying false but keeps currentArticleId", () => {
    usePlayerStore.getState().play("article-42");
    usePlayerStore.getState().pause();
    const state = usePlayerStore.getState();
    expect(state.isPlaying).toBe(false);
    expect(state.currentArticleId).toBe("article-42");
  });

  it("stop() resets isPlaying, currentArticleId, progress, and duration", () => {
    usePlayerStore.getState().play("article-42");
    usePlayerStore.getState().setProgress(50);
    usePlayerStore.getState().setDuration(120);
    usePlayerStore.getState().stop();
    const state = usePlayerStore.getState();
    expect(state.isPlaying).toBe(false);
    expect(state.currentArticleId).toBeNull();
    expect(state.progress).toBe(0);
    expect(state.duration).toBe(0);
  });

  it("setProgress(n) updates progress", () => {
    usePlayerStore.getState().setProgress(75);
    expect(usePlayerStore.getState().progress).toBe(75);
  });

  it("setDuration(n) updates duration", () => {
    usePlayerStore.getState().setDuration(300);
    expect(usePlayerStore.getState().duration).toBe(300);
  });

  it("setVoice(v) updates voice", () => {
    usePlayerStore.getState().setVoice("en-US-JennyNeural");
    expect(usePlayerStore.getState().voice).toBe("en-US-JennyNeural");
  });
});
