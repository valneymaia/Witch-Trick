import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      '/socket.io': { target: 'http://localhost:3001', ws: true },
    },
  },
});
