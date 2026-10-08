import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

const devProxy = () => {
  const target = process.env.API_PROXY_TARGET ?? 'http://localhost:8787'
  return {
    target,
    changeOrigin: true,
    configure: (proxy) => {
      proxy.on('proxyReq', (req) => {
        if (req.getHeader('origin')) req.setHeader('origin', new URL(target).origin)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Release tag for error reports: the commit Cloudflare Pages is building
  define: {
    'import.meta.env.VITE_RELEASE': JSON.stringify(process.env.CF_PAGES_COMMIT_SHA?.slice(0, 12) ?? 'dev'),
  },
  // In dev, forward API + media requests to the backend (server/, `npm run
  // dev` there) so the session cookie is same-origin. The browser tests
  // point this at their own API with API_PROXY_TARGET. The Origin header is
  // rewritten to the target's so the API's CSRF check sees a same-origin write.
  server: {
    proxy: {
      '/api': devProxy(),
      '/media': devProxy(),
    },
  },
  build: {
    sourcemap: false,
  },
})
