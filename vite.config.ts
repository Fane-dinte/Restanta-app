import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react(), {
    // writes sw.js listing this build's files; .woff/.ttf are KaTeX fallbacks no browser with service workers loads
    name: 'sw',
    generateBundle(_, bundle) {
      const files = ['/', ...Object.keys(bundle).filter(f => !/\.(html|woff|ttf)$/.test(f)).map(f => '/' + f)]
      const source = readFileSync('src/sw.js', 'utf8').replace('__BUILD__', String(Date.now())).replace('__FILES__', JSON.stringify(files))
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }],
})
