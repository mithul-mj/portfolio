import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
    base: '/portfolio/',  // GitHub repo name for GitHub Pages
    build: {
        outDir: 'dist',
    },
})
