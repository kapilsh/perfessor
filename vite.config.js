import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    // Increase chunk size limit for large dependencies
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Optimize chunking for better caching
        manualChunks: {
          vendor: ['react', 'react-dom', 'zustand'],
          charts: ['recharts', 'd3-scale', 'd3-color'],
          tables: ['@tanstack/react-table', '@tanstack/react-virtual'],
        },
      },
    },
  },
  base: '/perfessor/',
  // Optimize worker handling
  worker: {
    format: 'es',
  },
})
