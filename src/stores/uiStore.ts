import { create } from "zustand";

type Theme = "light" | "dark" | "system";

interface UIState {
  theme: Theme;
  isSummaryModalOpen: boolean;
  selectedArticleId: string | null;
  searchQuery: string;
  activeSourceFilter: string | null;

  setTheme: (theme: Theme) => void;
  openSummaryModal: (articleId: string) => void;
  closeSummaryModal: () => void;
  setSearchQuery: (query: string) => void;
  setActiveSourceFilter: (sourceId: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: "system",
  isSummaryModalOpen: false,
  selectedArticleId: null,
  searchQuery: "",
  activeSourceFilter: null,

  setTheme: (theme) => set({ theme }),
  openSummaryModal: (articleId) =>
    set({ isSummaryModalOpen: true, selectedArticleId: articleId }),
  closeSummaryModal: () =>
    set({ isSummaryModalOpen: false, selectedArticleId: null }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setActiveSourceFilter: (sourceId) => set({ activeSourceFilter: sourceId }),
}));
