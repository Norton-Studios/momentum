import "@testing-library/jest-dom/vitest";
import React from "react";
import { vi } from "vitest";

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
