import { defineConfig, loadEnv } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'

const config = defineConfig(({ mode }) => {
  // Make .env.local available to server code via process.env.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
    resolve: { tsconfigPaths: true },
    plugins: [tanstackStart(), viteReact()],
  }
})

export default config
