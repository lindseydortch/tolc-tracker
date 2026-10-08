import { defineConfig, loadEnv } from 'vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import netlify from '@netlify/vite-plugin-tanstack-start'

import viteReact from '@vitejs/plugin-react'

const config = defineConfig(({ mode }) => {
  // Make .env.local available to server code via process.env.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
    resolve: { tsconfigPaths: true },
    plugins: [tanstackStart(), netlify(), viteReact()],
  }
})

export default config
