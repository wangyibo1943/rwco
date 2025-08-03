// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      // 放行 eval、inline 脚本、HMR websocket、blob 等
      'Content-Security-Policy': [
        "default-src * 'unsafe-inline' 'unsafe-eval' data: blob: ws: http: https:;",
        "script-src  * 'unsafe-inline' 'unsafe-eval' blob: data:;",
        "connect-src * ws: http: https:;",
        "style-src   * 'unsafe-inline' blob: data:;",
        "img-src     * data: blob:;",
        "font-src    * data: blob:;"
      ].join(' ')
    }
  }
})
