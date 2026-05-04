import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/stream': 'http://localhost:4000',
      '/metrics': 'http://localhost:4000',
      '/settings': 'http://localhost:4000',
      '/services': 'http://localhost:4000',
      '/auth': 'http://localhost:4000',
      '/stripe': 'http://localhost:4000',
      '/logs': 'http://localhost:4000',
    },
  },
});
