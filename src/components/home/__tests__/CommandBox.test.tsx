import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandBox } from "../CommandBox";

// Mock modules
vi.mock("@/stores/uiStore", () => ({
  useUIStore: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: { info: vi.fn() },
}));

import { useUIStore } from "@/stores/uiStore";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const mockSetSearchQuery = vi.fn();
const mockPush = vi.fn();

const mockUseUIStore = vi.mocked(useUIStore);
const mockUseRouter = vi.mocked(useRouter);

describe("CommandBox", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUIStore.mockReturnValue({
      setSearchQuery: mockSetSearchQuery,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockUseRouter.mockReturnValue({
      push: mockPush,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  it("renders input with correct placeholder", () => {
    render(<CommandBox />);

    const input = screen.getByPlaceholderText(
      "Wklej URL bloga, zadaj pytanie, lub powiedz czego szukasz..."
    );
    expect(input).toBeInTheDocument();
  });

  it("calls onAddSource with URL when URL is submitted via Enter", async () => {
    const user = userEvent.setup();
    const onAddSource = vi.fn();
    render(<CommandBox onAddSource={onAddSource} />);

    const input = screen.getByPlaceholderText(
      "Wklej URL bloga, zadaj pytanie, lub powiedz czego szukasz..."
    );
    await user.type(input, "https://example.com{Enter}");

    expect(onAddSource).toHaveBeenCalledWith("https://example.com");
    expect(input).toHaveValue("");
  });

  it("auto-prefixes https:// for bare domain URLs", async () => {
    const user = userEvent.setup();
    const onAddSource = vi.fn();
    render(<CommandBox onAddSource={onAddSource} />);

    const input = screen.getByPlaceholderText(
      "Wklej URL bloga, zadaj pytanie, lub powiedz czego szukasz..."
    );
    await user.type(input, "example.com{Enter}");

    expect(onAddSource).toHaveBeenCalledWith("https://example.com");
    expect(input).toHaveValue("");
  });

  it("calls setSearchQuery for non-URL text and clears input", async () => {
    const user = userEvent.setup();
    render(<CommandBox />);

    const input = screen.getByPlaceholderText(
      "Wklej URL bloga, zadaj pytanie, lub powiedz czego szukasz..."
    );
    await user.type(input, "artificial intelligence{Enter}");

    expect(mockSetSearchQuery).toHaveBeenCalledWith("artificial intelligence");
    expect(input).toHaveValue("");
  });

  it("does nothing when submitting empty input", async () => {
    const user = userEvent.setup();
    const onAddSource = vi.fn();
    render(<CommandBox onAddSource={onAddSource} />);

    const input = screen.getByPlaceholderText(
      "Wklej URL bloga, zadaj pytanie, lub powiedz czego szukasz..."
    );
    await user.type(input, "{Enter}");

    expect(onAddSource).not.toHaveBeenCalled();
    expect(mockSetSearchQuery).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows toast when 'Zapytaj AI' button is clicked", async () => {
    const user = userEvent.setup();
    render(<CommandBox />);

    const button = screen.getByRole("button", { name: /Zapytaj AI/i });
    await user.click(button);

    expect(toast.info).toHaveBeenCalledWith("Wkrotce dostepne", expect.objectContaining({
      description: expect.any(String),
    }));
  });

  it("submits URL via send button click", async () => {
    const user = userEvent.setup();
    const onAddSource = vi.fn();
    render(<CommandBox onAddSource={onAddSource} />);

    const input = screen.getByPlaceholderText(
      "Wklej URL bloga, zadaj pytanie, lub powiedz czego szukasz..."
    );
    await user.type(input, "https://blog.example.com");

    const sendButton = screen.getByRole("button", { name: /Wyslij/i });
    await user.click(sendButton);

    expect(onAddSource).toHaveBeenCalledWith("https://blog.example.com");
    expect(input).toHaveValue("");
  });

  it("navigates to /settings/sources when URL submitted without onAddSource", async () => {
    const user = userEvent.setup();
    render(<CommandBox />);

    const input = screen.getByPlaceholderText(
      "Wklej URL bloga, zadaj pytanie, lub powiedz czego szukasz..."
    );
    await user.type(input, "https://example.com{Enter}");

    expect(mockPush).toHaveBeenCalledWith(
      "/settings/sources?addUrl=https%3A%2F%2Fexample.com"
    );
    expect(input).toHaveValue("");
  });

  it("'Dodaj URL' button submits when input has content", async () => {
    const user = userEvent.setup();
    const onAddSource = vi.fn();
    render(<CommandBox onAddSource={onAddSource} />);

    const input = screen.getByPlaceholderText(
      "Wklej URL bloga, zadaj pytanie, lub powiedz czego szukasz..."
    );
    await user.type(input, "https://test.com");

    const addUrlButton = screen.getByRole("button", { name: /Dodaj URL/i });
    await user.click(addUrlButton);

    expect(onAddSource).toHaveBeenCalledWith("https://test.com");
  });

  it("'Dodaj URL' button shows toast when input is empty", async () => {
    const user = userEvent.setup();
    render(<CommandBox />);

    const addUrlButton = screen.getByRole("button", { name: /Dodaj URL/i });
    await user.click(addUrlButton);

    expect(toast.info).toHaveBeenCalledWith("Wklej URL w pole powyzej");
  });

  it("'Szukaj' button sets search query and clears input", async () => {
    const user = userEvent.setup();
    render(<CommandBox />);

    const input = screen.getByPlaceholderText(
      "Wklej URL bloga, zadaj pytanie, lub powiedz czego szukasz..."
    );
    await user.type(input, "react hooks");

    const searchButton = screen.getByRole("button", { name: /Szukaj/i });
    await user.click(searchButton);

    expect(mockSetSearchQuery).toHaveBeenCalledWith("react hooks");
    expect(input).toHaveValue("");
  });

  it("mic button shows 'Wkrotce dostepne' toast", async () => {
    const user = userEvent.setup();
    render(<CommandBox />);

    const micButtons = screen.getAllByRole("button", { name: /Mikrofon/i });
    await user.click(micButtons[0]);

    expect(toast.info).toHaveBeenCalledWith("Wkrotce dostepne", expect.objectContaining({
      description: expect.any(String),
    }));
  });
});
