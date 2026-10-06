import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Define la ruta base si tu app se sirve desde /hubkickz/
  base: '/hubkickz/', 
  server: {
    port: 5173,
    hmr: {
      // Forzar la conexión HMR al host y protocolo correcto local
      host: 'localhost',
      protocol: 'ws',
    },
  },
});