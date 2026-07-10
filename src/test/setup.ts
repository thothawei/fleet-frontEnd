import '@testing-library/jest-dom/vitest';

// jsdom 未實作 matchMedia，Ant Design 部分元件會用到
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// jsdom 未實作 ResizeObserver，Ant Design 的 Space wrap / RangePicker 等會用到
globalThis.ResizeObserver = class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
};
