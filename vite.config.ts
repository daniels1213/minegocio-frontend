import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_URL || 'https://minegocio-backend.onrender.com'
  const apiProxy: ProxyOptions = {
    target: apiTarget,
    changeOrigin: true,
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyRequest) => proxyRequest.removeHeader('origin'))
    },
  }

  return {
    plugins: [vue(), UnoCSS()],
    server: {
      proxy: {
        '/api': apiProxy,
        '/actuator': apiProxy,
      },
    },
  }
})
