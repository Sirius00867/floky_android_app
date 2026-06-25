import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * HTML shell para Expo Web (output: static).
 * Inyecta metadatos PWA, apple-touch-icon y registra el Service Worker.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />

        {/* Viewport mobile-first */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />

        {/* PWA básico */}
        <meta name="application-name" content="Floky" />
        <meta name="description" content="App gamificada para adolescentes con diabetes tipo 1 y dislexia." />
        <meta name="theme-color" content="#208AEF" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* iOS PWA */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Floky" />

        {/* Iconos */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" sizes="48x48" href="/images/favicon.png" />
        <link rel="apple-touch-icon" href="/images/icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/images/icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/images/icon.png" />

        {/* Open Graph (instalación desde redes) */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Floky" />
        <meta property="og:description" content="Gestión de glucosa, insulina y rutinas para adolescentes con T1D." />
        <meta property="og:image" content="/images/icon.png" />

        {/* Evita el bounce / overscroll en iOS */}
        <ScrollViewStyleReset />

        {/* Registro del Service Worker */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function () {
                  navigator.serviceWorker
                    .register('/sw.js')
                    .catch(function (err) {
                      console.warn('[Floky SW] registro fallido:', err);
                    });
                });
              }
            `,
          }}
        />

        {/* Estilos globales: evitar barras de scroll y fondo blanco durante carga */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              * { box-sizing: border-box; }
              html, body {
                margin: 0;
                padding: 0;
                height: 100%;
                overflow: hidden;
                background-color: #208AEF;
              }
              #root { height: 100%; display: flex; flex-direction: column; }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
