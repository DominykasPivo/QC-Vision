import { act, render, screen } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { useDeviceDetection } from "./useDeviceDetection";

type MatchMediaListener = (event: MediaQueryListEvent) => void;

function DeviceDetectionProbe() {
  const { isMobile } = useDeviceDetection();

  return (
    <div data-testid="device-state">{isMobile ? "mobile" : "desktop"}</div>
  );
}

describe("useDeviceDetection", () => {
  let listeners: Set<MatchMediaListener>;
  let currentMatch = true;

  const emitMediaChange = (matches: boolean) => {
    currentMatch = matches;

    const event = {
      matches,
      media: "(max-width: 1023px)",
    } as MediaQueryListEvent;

    listeners.forEach((listener) => listener(event));
  };

  beforeEach(() => {
    listeners = new Set<MatchMediaListener>();
    currentMatch = true;

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 768,
    });

    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn((query: string) => ({
        matches: currentMatch,
        media: query,
        onchange: null,
        addEventListener: vi.fn(
          (event: string, listener: MatchMediaListener) => {
            if (event === "change") {
              listeners.add(listener);
            }
          },
        ),
        removeEventListener: vi.fn(
          (event: string, listener: MatchMediaListener) => {
            if (event === "change") {
              listeners.delete(listener);
            }
          },
        ),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("updates from mobile to desktop when the breakpoint changes", () => {
    render(<DeviceDetectionProbe />);

    expect(screen.getByTestId("device-state")).toHaveTextContent("mobile");

    act(() => {
      emitMediaChange(false);
    });

    expect(screen.getByTestId("device-state")).toHaveTextContent("desktop");
  });
});
