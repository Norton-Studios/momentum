import "@testing-library/jest-dom/vitest";
import React from "react";
import { vi } from "vitest";

// Set dummy DATABASE_URL for tests that transitively import db modules
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test";

// Mock ResizeObserver for Recharts charts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock recharts ResponsiveContainer to avoid dimension warnings in tests
vi.mock("recharts", async () => {
  const actual = await vi.importActual<typeof import("recharts")>("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => React.createElement("div", { style: { width: 800, height: 400 } }, children),
  };
});
