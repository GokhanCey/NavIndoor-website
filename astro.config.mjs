// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  i18n: {
    defaultLocale: 'it',
    locales: ['en', 'it'],
    routing: {
      prefixDefaultLocale: true,
      // We redirect "/" to "/it/" ourselves via src/pages/index.astro,
      // so Astro's automatic redirect is disabled to avoid a conflict.
      redirectToDefaultLocale: false,
    },
  },
});
