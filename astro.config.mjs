// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import clerk from '@clerk/astro';
import db from '@astrojs/db';

// https://astro.build/config
export default defineConfig({
  site: 'https://rewardhive.store',
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
    plugins: [tailwindcss()]
  },

  adapter: vercel(),

  integrations: [
    db(),
    clerk({
      afterSignInUrl: '/admin',
      afterSignUpUrl: '/admin',
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
