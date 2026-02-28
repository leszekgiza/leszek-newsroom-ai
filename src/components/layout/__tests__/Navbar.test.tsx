import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Navbar } from "../Navbar";

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("@/stores/uiStore", () => ({
  useUIStore: vi.fn(),
}));

import { useAuthStore } from "@/stores/authStore";
import { useUIStore } from "@/stores/uiStore";

const mockUseAuthStore = vi.mocked(useAuthStore);
const mockUseUIStore = vi.mocked(useUIStore);

const mockSetShowSyncModal = vi.fn();

function setupMocks(isAuthenticated = true) {
  mockUseAuthStore.mockReturnValue({
    user: {
      id: "1",
      email: "test@test.com",
      name: "Test User",
      avatarUrl: null,
      theme: "LIGHT" as const,
    },
    isAuthenticated,
    isLoading: false,
    setUser: vi.fn(),
    logout: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  mockUseUIStore.mockReturnValue({
    setShowSyncModal: mockSetShowSyncModal,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

describe("Navbar – sync button", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockSetShowSyncModal.mockClear();
    setupMocks();
  });

  it('renders sync button with title "Pobierz nowe" when authenticated', () => {
    render(<Navbar />);

    const syncButton = screen.getByTitle("Pobierz nowe");
    expect(syncButton).toBeInTheDocument();
  });

  it("calls setShowSyncModal(true) when sync button is clicked", async () => {
    render(<Navbar />);

    const syncButton = screen.getByTitle("Pobierz nowe");
    await userEvent.click(syncButton);

    expect(mockSetShowSyncModal).toHaveBeenCalledTimes(1);
    expect(mockSetShowSyncModal).toHaveBeenCalledWith(true);
  });

  it("does not render sync button when not authenticated", () => {
    setupMocks(false);
    render(<Navbar />);

    expect(screen.queryByTitle("Pobierz nowe")).not.toBeInTheDocument();
  });
});
