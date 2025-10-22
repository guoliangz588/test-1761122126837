// Learn more: https://github.com/testing-library/jest-dom
import 'whatwg-fetch';
import '@testing-library/jest-dom'

// Polyfill for setImmediate, which is used by some libraries but not available in JSDOM
if (typeof setImmediate === 'undefined') {
  global.setImmediate = ((callback: (...args: any[]) => void, ...args: any[]) => {
    return setTimeout(callback, 0, ...args);
  }) as any;
} 