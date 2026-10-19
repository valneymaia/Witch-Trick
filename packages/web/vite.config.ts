import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  server: { proxy: { '/socket.io': 'http://localhost:3001' } },
});
