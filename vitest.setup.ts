import "@testing-library/jest-dom/vitest";

// Mock ResizeObserver for Recharts charts
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
