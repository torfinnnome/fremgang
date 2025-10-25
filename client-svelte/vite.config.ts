import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    sveltekit(),
  ],
  server: {
    host: 'fremgang.nome.priv.no',
    proxy: {
      '/api': 'http://localhost:3010',
    },
  },
});