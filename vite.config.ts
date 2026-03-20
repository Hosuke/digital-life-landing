import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(rootDir, 'index.html'),
        english: resolve(rootDir, 'index.en.html'),
        experience: resolve(rootDir, 'experience.html'),
        modelscope: resolve(rootDir, 'modelscope-static/index.html')
      }
    }
  }
});
