import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const isGitHubPages = env.GITHUB_ACTIONS === 'true'

  return {
    plugins: [react()],
    // GitHub Pages serves this repository under /calcura-frontend/;
    // Vercel and local development continue to use the site root.
    base: isGitHubPages ? '/calcura-frontend/' : '/',
    server: {
      port: 5173,
      host: '0.0.0.0',
    },
  }
})
