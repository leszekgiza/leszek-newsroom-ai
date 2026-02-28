import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore, User } from "@/stores/authStore";

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
};

const testUser: User = {
  id: "user-1",
  email: "test@example.com",
  name: "Test User",
  avatarUrl: "https://example.com/avatar.png",
  theme: "SYSTEM",
};

describe("authStore", () => {
  beforeEach(() => {
    useAuthStore.setState(initialState);
  });

  it("has correct initial state: user null, isAuthenticated false, isLoading true", () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(true);
  });

  it("setUser() sets user object, isAuthenticated to true, isLoading to false", () => {
    useAuthStore.getState().setUser(testUser);
    const state = useAuthStore.getState();
    expect(state.user).toEqual(testUser);
    expect(state.isAuthenticated).toBe(true);
    expect(state.isLoading).toBe(false);
  });

  it("setUser(null) clears user, sets isAuthenticated to false, isLoading to false", () => {
    useAuthStore.getState().setUser(testUser);
    useAuthStore.getState().setUser(null);
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });

  it("logout() clears user and sets isAuthenticated to false", () => {
    useAuthStore.getState().setUser(testUser);
    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.isLoading).toBe(false);
  });

  it("User interface has correct fields (id, email, name, avatarUrl, theme)", () => {
    useAuthStore.getState().setUser(testUser);
    const user = useAuthStore.getState().user!;
    expect(user).toHaveProperty("id");
    expect(user).toHaveProperty("email");
    expect(user).toHaveProperty("name");
    expect(user).toHaveProperty("avatarUrl");
    expect(user).toHaveProperty("theme");
    expect(["LIGHT", "DARK", "SYSTEM"]).toContain(user.theme);
  });
});
