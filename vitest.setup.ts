import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';

// Node 22+ exposes a built-in localStorage global (node:internal/webstorage) that
// requires --localstorage-file and does not implement clear()/key(). Override it with
// a simple in-memory implementation so tests can use localStorage normally.
const createLocalStorageMock = () => {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string): string | null => store[key] ?? null,
    setItem: (key: string, value: string): void => { store[key] = String(value); },
    removeItem: (key: string): void => { delete store[key]; },
    clear: (): void => { Object.keys(store).forEach(k => { delete store[k]; }); },
    key: (index: number): string | null => Object.keys(store)[index] ?? null,
    get length(): number { return Object.keys(store).length; },
  };
};

Object.defineProperty(globalThis, 'localStorage', {
  value: createLocalStorageMock(),
  writable: true,
  configurable: true,
});

// Mock matchMedia for tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {}, // deprecated
    removeListener: () => {}, // deprecated
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  }),
});

// Polyfill for PDF.js compatibility with jsdom
if (typeof DOMMatrix === 'undefined') {
  class DOMMatrixPolyfill {
    a: number = 1;
    b: number = 0;
    c: number = 0;
    d: number = 1;
    e: number = 0;
    f: number = 0;
    m11: number = 1;
    m21: number = 0;
    m31: number = 0;
    m12: number = 0;
    m22: number = 1;
    m32: number = 0;
    m13: number = 0;
    m23: number = 0;
    m33: number = 1;
    m14: number = 0;
    m24: number = 0;
    m34: number = 0;
    m41: number = 0;
    m42: number = 0;
    m43: number = 0;
    m44: number = 1;
    is2D: boolean = true;
    isIdentity: boolean = true;

    constructor(init?: string | number[]) {
      if (init) {
        const values = typeof init === 'string' ? 
          init.split(/[(),\s]+/).filter(Boolean).map(Number) : 
          init;
        Object.assign(this, {
          a: values[0] || 1,
          b: values[1] || 0,
          c: values[2] || 0,
          d: values[3] || 1,
          e: values[4] || 0,
          f: values[5] || 0,
        });
      }
    }
  }
  (globalThis as Record<string, unknown>).DOMMatrix = DOMMatrixPolyfill;
}
