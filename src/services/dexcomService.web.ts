// Web stub — expo-auth-session requires native build; OAuth Dexcom not available on web
export async function isConnected(): Promise<boolean> { return false; }
export async function loginWithDexcom(): Promise<boolean> { return false; }
export async function fetchTodayEGV(): Promise<never[]> { return []; }
export async function fetchLatestEGV(): Promise<null> { return null; }
export async function clearDexcomTokens(): Promise<void> {}
