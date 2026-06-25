import { Platform } from 'react-native';

// Completely safe no-op storage — never throws, never reads/writes
const noopStorage = {
  getItem:    (_key: string): Promise<string | null> => Promise.resolve(null),
  setItem:    (_key: string, _value: string): Promise<void> => Promise.resolve(),
  removeItem: (_key: string): Promise<void> => Promise.resolve(),
};

// localStorage storage — only used in browser context
const makeWebStorage = () => ({
  getItem: (key: string): Promise<string | null> => {
    try { return Promise.resolve(localStorage.getItem(key)); }
    catch { return Promise.resolve(null); }
  },
  setItem: (key: string, value: string): Promise<void> => {
    try { localStorage.setItem(key, value); } catch {}
    return Promise.resolve();
  },
  removeItem: (key: string): Promise<void> => {
    try { localStorage.removeItem(key); } catch {}
    return Promise.resolve();
  },
});

function buildStorage() {
  // SSR / Node.js: window doesn't exist
  if (typeof globalThis.window === 'undefined') return noopStorage;

  if (Platform.OS === 'web') {
    try {
      // Test localStorage is available
      localStorage.getItem('__test__');
      return makeWebStorage();
    } catch {
      return noopStorage;
    }
  }

  // Native: use AsyncStorage
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@react-native-async-storage/async-storage').default;
  } catch {
    return noopStorage;
  }
}

export const persistStorage = buildStorage();
