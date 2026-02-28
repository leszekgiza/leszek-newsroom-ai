import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "@/stores/uiStore";

describe("uiStore – showSyncModal", () => {
  beforeEach(() => {
    useUIStore.setState({ showSyncModal: false });
  });

  it("defaults showSyncModal to false", () => {
    const state = useUIStore.getState();
    expect(state.showSyncModal).toBe(false);
  });

  it("setShowSyncModal(true) sets showSyncModal to true", () => {
    useUIStore.getState().setShowSyncModal(true);
    expect(useUIStore.getState().showSyncModal).toBe(true);
  });

  it("setShowSyncModal(false) sets showSyncModal back to false", () => {
    useUIStore.setState({ showSyncModal: true });
    useUIStore.getState().setShowSyncModal(false);
    expect(useUIStore.getState().showSyncModal).toBe(false);
  });
});
