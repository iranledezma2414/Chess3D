// nuxt.config.ts
export default defineNuxtConfig({
  // 1. DESACTIVA EL SSR (Fundamental para juegos 3D en Vercel)
  ssr: false,

  modules: [
    '@nuxtjs/tailwindcss'
  ],

  // 2. TRANSPILA LAS LIBRERÍAS
  build: {
    transpile: ['three', 'chess.js']
  },

  // 3. RESOLUCIÓN DE RUTAS PARA VITE
  vite: {
    optimizeDeps: {
      include: ['three', 'chess.js']
    },
    resolve: {
      alias: {
        // Esto fuerza a Vite a usar la carpeta node_modules de forma directa
        'three': 'three',
        'chess.js': 'chess.js'
      }
    }
  },

  compatibilityDate: '2024-04-03'
})