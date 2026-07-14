import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget = env.VITE_API_BASE_URL || 'http://localhost:3000';

  return {
    plugins: [react()],
    server: {
      host: env.VITE_HOST || '0.0.0.0',
      port: Number(env.VITE_PORT || 5173),
      proxy: {
        '/workers': {
          target: backendTarget,
          changeOrigin: true
        },
        '/customers': {
          target: backendTarget,
          changeOrigin: true
        },
        '/general': {
          target: backendTarget,
          changeOrigin: true
        }
      }
    }
  };
});
