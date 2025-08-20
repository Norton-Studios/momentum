import "@testing-library/jest-dom";

// Create a proper mock AbortSignal that extends EventTarget to satisfy instanceof checks
class MockAbortSignal extends EventTarget {
  aborted = false;
  reason?: any;

  static abort(reason?: any) {
    const signal = new MockAbortSignal();
    signal.aborted = true;
    signal.reason = reason;
    return signal;
  }

  static timeout(_milliseconds: number) {
    return new MockAbortSignal();
  }

  throwIfAborted() {
    if (this.aborted) {
      throw this.reason;
    }
  }
}

// Mock AbortController to prevent AbortSignal issues in tests
class MockAbortController {
  signal = new MockAbortSignal();

  abort(reason?: any) {
    (this.signal as any).aborted = true;
    (this.signal as any).reason = reason;
  }
}

// Override global objects to use our mocks
Object.defineProperty(globalThis, "AbortSignal", {
  value: MockAbortSignal,
  writable: true,
});

Object.defineProperty(globalThis, "AbortController", {
  value: MockAbortController,
  writable: true,
});
