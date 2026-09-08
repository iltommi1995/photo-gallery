import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Vitest globals are off (see vitest.config.ts), so Testing Library's own
// auto-cleanup detection doesn't fire — register it explicitly, otherwise
// each test's rendered DOM leaks into the next.
afterEach(() => {
  cleanup();
});

// next/font/google's loaders are a Next.js build-time transform (Webpack/
// Turbopack plugin) — calling one directly in a plain Node/Vitest
// environment throws ("Anton is not a function" etc.), since there's no
// bundler to intercept the call. Vitest's ESM interop needs the mock's
// named exports to be statically enumerable to build the module namespace
// object, so a dynamic Proxy (get/has traps) doesn't satisfy it — list
// every font actually imported anywhere in src/ instead; add a new one
// here if a component starts using it.
vi.mock("next/font/google", () => {
  const font = () => ({ className: "mock-font", variable: "--mock-font", style: {} });
  return {
    Anton: font,
    Bebas_Neue: font,
    Courier_Prime: font,
    Geist: font,
    Geist_Mono: font,
  };
});
