import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuickHints } from "../QuickHints";

// Mock modules
vi.mock("@/stores/uiStore", () => ({
  useUIStore: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));

import { useUIStore } from "@/stores/uiStore";
import { useRouter } from "next/navigation";

const mockSetActiveEditionDate = vi.fn();
const mockPush = vi.fn();

const mockUseUIStore = vi.mocked(useUIStore);
const mockUseRouter = vi.mocked(useRouter);

describe("QuickHints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUIStore.mockReturnValue({
      setActiveEditionDate: mockSetActiveEditionDate,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockUseRouter.mockReturnValue({
      push: mockPush,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  it("renders all 4 hint chips with correct labels", () => {
    render(<QuickHints />);

    expect(screen.getByText("Odsluchaj wydanie")).toBeInTheDocument();
    expect(screen.getByText("Co nowego?")).toBeInTheDocument();
    expect(screen.getByText("Dodaj zrodlo")).toBeInTheDocument();
    expect(screen.getByText("Podlacz Gmail")).toBeInTheDocument();
  });

  it("'Dodaj zrodlo' click calls onFillInput with 'https://'", async () => {
    const user = userEvent.setup();
    const onFillInput = vi.fn();
    render(<QuickHints onFillInput={onFillInput} />);

    await user.click(screen.getByText("Dodaj zrodlo"));

    expect(onFillInput).toHaveBeenCalledWith("https://");
  });

  it("'Co nowego?' click calls setActiveEditionDate with null", async () => {
    const user = userEvent.setup();
    render(<QuickHints />);

    await user.click(screen.getByText("Co nowego?"));

    expect(mockSetActiveEditionDate).toHaveBeenCalledWith(null);
  });

  it("'Podlacz Gmail' click calls router.push with navigate path", async () => {
    const user = userEvent.setup();
    render(<QuickHints />);

    await user.click(screen.getByText("Podlacz Gmail"));

    expect(mockPush).toHaveBeenCalledWith("/settings/integrations/gmail");
  });

  it("'Odsluchaj wydanie' click calls setActiveEditionDate with today's date", async () => {
    const user = userEvent.setup();
    render(<QuickHints />);

    await user.click(screen.getByText("Odsluchaj wydanie"));

    const today = new Date().toISOString().slice(0, 10);
    expect(mockSetActiveEditionDate).toHaveBeenCalledWith(today);
  });
});
