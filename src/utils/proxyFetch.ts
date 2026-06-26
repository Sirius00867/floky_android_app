/**
 * proxyFetch — wrapper de fetch para servicios CGM.
 *
 * Estrategia:
 *  • Nativo (iOS/Android): fetch directo sin restricciones CORS.
 *  • Web (PWA/Netlify):    siempre pasa por proxy CORS.
 *      - Usa EXPO_PUBLIC_CORS_PROXY_URL si está definida en el build.
 *      - Si no, usa corsproxy.io como fallback garantizado.
 *
 * ── Configuración Netlify estático ───────────────────────────────────────────
 * Añade en netlify.toml [build.environment]:
 *   EXPO_PUBLIC_CORS_PROXY_URL = "https://corsproxy.io/?"
 *
 * ⚠ AVISO DE SEGURIDAD: corsproxy.io es un proxy público compartido.
 *   Las credenciales (Nightscout secret, tokens CGM) pasan por ese servidor.
 *   Para producción usa tu propio Cloudflare Worker como proxy privado.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Platform } from 'react-native';

// Resuelto en tiempo de compilación por Metro/Expo.
// Si Netlify no inyecta la variable, el fallback garantiza que la PWA funcione.
const proxyUrl: string =
  (process.env.EXPO_PUBLIC_CORS_PROXY_URL ?? '').trim() || 'https://corsproxy.io/?';

/** true cuando se ejecuta en la plataforma web (PWA / Netlify). */
export function isBrowser(): boolean {
  return Platform.OS === 'web';
}

/**
 * Envuelve una URL externa en el proxy CORS configurado.
 * Solo llamar desde contexto web; en nativo devuelve la URL sin cambios.
 */
export function toProxyUrl(externalUrl: string): string {
  return `${proxyUrl}${encodeURIComponent(externalUrl)}`;
}

/**
 * fetch con gestión automática de CORS.
 *  - Web:    pasa siempre por el proxy (env var o corsproxy.io de fallback).
 *  - Nativo: fetch directo, sin proxy.
 */
export async function proxyFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  if (!isBrowser()) {
    return fetch(url, init);
  }
  return fetch(toProxyUrl(url), init);
}
