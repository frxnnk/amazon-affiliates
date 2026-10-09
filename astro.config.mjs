// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import clerk from '@clerk/astro';
import db from '@astrojs/db';
import node from '@astrojs/node';
import { loadEnv } from 'vite';

// Runtime code reads process.env so provider secrets are not compiled into SSR chunks.
// Keep .env development support; production receives values from its host.
for (const [name, value] of Object.entries(loadEnv(process.env.NODE_ENV || 'development', process.cwd(), ''))) {
  process.env[name] ??= value;
}

// https://astro.build/config
export default defineConfig({
  site: 'https://www.rewardhive.store',
  output: 'server', // SSR para APIs

  i18n: {
    locales: ['es', 'en'],
    defaultLocale: 'es',
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true
    }
  },

  vite: {
    plugins: [tailwindcss()],
    // Astro DB otherwise compiles this private URL. Node chooses its database at startup.
    define: process.env.DEPLOY_TARGET === 'openship'
      ? { 'import.meta.env.ASTRO_DB_REMOTE_URL': 'process.env.ASTRO_DB_REMOTE_URL' }
      : undefined,
  },

  adapter: process.env.DEPLOY_TARGET === 'openship' ? node({ mode: 'standalone' }) : vercel(),

  integrations: [
    db(),
    clerk({
      signInFallbackRedirectUrl: '/admin',
      signUpFallbackRedirectUrl: '/admin',
    }),
    sitemap({
      filter: (page) => !page.includes('/admin'),
      i18n: {
        defaultLocale: 'es',
        locales: {
          es: 'es-ES',
          en: 'en-US'
        }
      }
    })
  ]
});
