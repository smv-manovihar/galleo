// Polyfill DOMParser globally in the Node.js main process to suppress warnings from exifreader
if (typeof (globalThis as any).DOMParser === 'undefined') {
  class MockDOMParser {
    parseFromString() {
      return null;
    }
  }
  (globalThis as any).DOMParser = MockDOMParser;
}
