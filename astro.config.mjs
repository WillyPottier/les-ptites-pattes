import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://les-ptites-pattes-de-chinon.netlify.app',
  trailingSlash: 'always',
  build: { format: 'directory' },
  integrations: [sitemap()],
});
