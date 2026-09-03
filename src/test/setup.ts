import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest globals are off (see vitest.config.ts), so Testing Library's own
// auto-cleanup detection doesn't fire — register it explicitly, otherwise
// each test's rendered DOM leaks into the next.
afterEach(() => {
  cleanup();
});
