import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Serve pp landing at / and React app at /login, /register, /dashboard
const appPaths = ['/login', '/register', '/dashboard']
function serveAppHtml() {
  return {
    name: 'serve-app-html',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] || ''
        if (appPaths.some((p) => url === p || url.startsWith(p + '/'))) {
          req.url = '/app.html'
        }
        next()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), serveAppHtml()],
  build: {
    rollupOptions: {
      input: ['index.html', 'app.html'],
    },
  },
  server: {
    port: 3000,
    open: true,
  },
})
