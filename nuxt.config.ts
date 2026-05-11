// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/tailwindcss'
  ],

  build: {
    transpile: ['three', 'chess.js']
  },

  vite: {
    optimizeDeps: {
      include: ['chess.js', 'three']
    }
  }
})