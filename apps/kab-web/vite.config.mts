import { defineConfig } from '@vatic/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      server: {
        hmr: false,
        proxy: {
          '/api': {
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
            // mock代理目标地址
            // target: 'http://localhost:5320/api',
            target: 'http://192.168.30.104:8085',
            ws: true,
          },
        },
      },
    },
  };
});
