import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/stores/authStore", () => ({
  useAuthStore: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

import { useAuthStore } from "@/stores/authStore";

const mockUseAuthStore = vi.mocked(useAuthStore);

function setupMocks() {
  mockUseAuthStore.mockReturnValue({
    user: {
      id: "1",
      email: "test@test.com",
      name: "Test User",
      avatarUrl: null,
      theme: "LIGHT" as const,
    },
    isAuthenticated: true,
    isLoading: false,
    setUser: vi.fn(),
    logout: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
}

import { Sidebar } from "../Sidebar";

describe("Sidebar – integration links", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setupMocks();
  });

  it("renders Gmail as a link pointing to /settings/integrations/gmail", () => {
    render(<Sidebar />);

    const gmailLink = screen.getByRole("link", { name: /Gmail/i });
    expect(gmailLink).toBeInTheDocument();
    expect(gmailLink).toHaveAttribute("href", "/settings/integrations/gmail");
  });

  it("renders LinkedIn as a link pointing to /settings/integrations/linkedin", () => {
    render(<Sidebar />);

    const linkedinLink = screen.getByRole("link", { name: /LinkedIn/i });
    expect(linkedinLink).toBeInTheDocument();
    expect(linkedinLink).toHaveAttribute(
      "href",
      "/settings/integrations/linkedin"
    );
  });
});
