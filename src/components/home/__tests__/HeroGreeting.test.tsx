import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HeroGreeting } from "../HeroGreeting";

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
}));

import { useAuthStore } from "@/stores/authStore";
const mockUseAuthStore = vi.mocked(useAuthStore);

const defaultProps = {
  newCount: 3,
  lastSyncAt: null,
  onSync: vi.fn(),
  isSyncing: false,
};

function mockAuth(name: string | null = "Leszek Giza") {
  mockUseAuthStore.mockReturnValue({
    user: {
      id: "1",
      email: "test@test.com",
      name,
      avatarUrl: null,
      theme: "LIGHT" as const,
    },
    isAuthenticated: true,
    isLoading: false,
    setUser: vi.fn(),
    logout: vi.fn(),
  } as any);
}

describe("HeroGreeting", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockAuth("Leszek Giza");
  });

  it("renders greeting with user first name", () => {
    render(<HeroGreeting {...defaultProps} />);

    expect(screen.getByText(/Leszek/)).toBeInTheDocument();
    // Should show one of the time-based greetings
    const heading = screen.getByRole("heading");
    expect(
      heading.textContent!.match(/Dzien dobry|Czesc|Dobry wieczor/)
    ).toBeTruthy();
  });

  it('renders "tam" when user has no name', () => {
    mockAuth(null);
    render(<HeroGreeting {...defaultProps} />);

    expect(screen.getByText(/tam/)).toBeInTheDocument();
  });

  it("shows article count when newCount > 0", () => {
    render(<HeroGreeting {...defaultProps} newCount={5} />);

    expect(screen.getByText(/5 nowych/)).toBeInTheDocument();
  });

  it('shows "Brak nowych" when newCount is 0', () => {
    render(<HeroGreeting {...defaultProps} newCount={0} />);

    expect(screen.getByText(/Brak nowych/)).toBeInTheDocument();
  });

  it("shows formatted sync time when lastSyncAt is provided", () => {
    render(
      <HeroGreeting
        {...defaultProps}
        lastSyncAt="2026-02-27T08:30:00Z"
      />
    );

    // Should show time formatted as HH:MM
    expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it("does not show sync time when lastSyncAt is null", () => {
    render(<HeroGreeting {...defaultProps} lastSyncAt={null} />);

    expect(screen.queryByText(/Sync:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ostatnia synchronizacja/)).not.toBeInTheDocument();
  });

  it('shows "Pobierz nowe" button when not syncing', () => {
    render(<HeroGreeting {...defaultProps} isSyncing={false} />);

    const button = screen.getByRole("button", { name: /Pobierz nowe/ });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it("calls onSync when sync button is clicked", async () => {
    const onSync = vi.fn();
    render(<HeroGreeting {...defaultProps} onSync={onSync} isSyncing={false} />);

    const button = screen.getByRole("button", { name: /Pobierz nowe/ });
    await userEvent.click(button);

    expect(onSync).toHaveBeenCalledTimes(1);
  });

  it('shows "Pobieram..." and disables button when syncing', () => {
    render(<HeroGreeting {...defaultProps} isSyncing={true} />);

    const button = screen.getByRole("button", { name: /Pobieram/ });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });
});
