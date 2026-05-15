import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';

function getAppUpdatedAt(): string {
  try {
    return execSync('git log -1 --format=%cI', { encoding: 'utf8' }).trim();
  } catch {
    return new Date().toISOString();
  }
}

export default defineConfig({
  define: {
    __APP_UPDATED_AT__: JSON.stringify(getAppUpdatedAt())
  },
  build: {
    chunkSizeWarningLimit: 750
  },
  server: {
    host: '0.0.0.0',
    port: 5173
  },
  preview: {
    host: '0.0.0.0',
    port: 4173
  }
});
