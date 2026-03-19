import { afterEach, vi, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom";

// Suppress act() warnings for Radix UI components that update state async
const originalError = console.error;
beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Warning: An update to")
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia for responsive design tests
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock window.ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock pointer events for Radix UI compatibility with jsdom
  if (typeof Element !== "undefined") {
    if (!Element.prototype.hasPointerCapture) {
      Element.prototype.hasPointerCapture = function () {
        return false;
      };
    }
    if (!Element.prototype.setPointerCapture) {
      Element.prototype.setPointerCapture = function () {
        return undefined;
      };
    }
    if (!Element.prototype.releasePointerCapture) {
      Element.prototype.releasePointerCapture = function () {
        return undefined;
      };
    }

    // Mock scrollIntoView for Radix UI Select component
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = function () {
        return undefined;
      };
    }
  }

  // Mock IntersectionObserver
  class MockIntersectionObserver {
    constructor() {}
    observe() {
      return null;
    }
    disconnect() {
      return null;
    }
    unobserve() {
      return null;
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  global.IntersectionObserver = MockIntersectionObserver as any;
});
