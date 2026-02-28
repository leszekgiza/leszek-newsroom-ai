import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "@/hooks/useDebounce";

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useDebounce", () => {
  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 500));

    expect(result.current).toBe("hello");
  });

  it("updates value after specified delay", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 500 } }
    );

    // Change value
    rerender({ value: "updated", delay: 500 });

    // Before delay: still initial
    expect(result.current).toBe("initial");

    // Advance timer past delay
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe("updated");
  });

  it("does not update value before delay elapses", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 500 } }
    );

    rerender({ value: "updated", delay: 500 });

    // Advance only partially
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe("initial");
  });

  it("resets timer on rapid value changes and only emits final value", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 500 } }
    );

    // Rapid changes
    rerender({ value: "b", delay: 500 });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    rerender({ value: "c", delay: 500 });
    act(() => {
      vi.advanceTimersByTime(200);
    });

    rerender({ value: "d", delay: 500 });

    // Still showing initial because timer keeps resetting
    expect(result.current).toBe("a");

    // Advance past the delay from last change
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Only final value should appear
    expect(result.current).toBe("d");
  });

  it("cleans up timer on unmount", () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, "clearTimeout");

    const { result, rerender, unmount } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 500 } }
    );

    // Trigger a value change to start a timer
    rerender({ value: "updated", delay: 500 });

    // Unmount before the timer fires
    unmount();

    // clearTimeout should have been called (cleanup from useEffect)
    expect(clearTimeoutSpy).toHaveBeenCalled();

    // Advancing timers should not cause errors
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // The debounced value should still be initial (never updated)
    expect(result.current).toBe("initial");

    clearTimeoutSpy.mockRestore();
  });
});
