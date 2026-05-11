// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/tailwindcss'
  ],

  // ESTO ES LO MÁS IMPORTANTE PARA VERCEL
  build: {
    transpile: ['three']
  },

  // Evita que Nuxt intente renderizar Three.js en el servidor durante el build
  ssr: true, // Puedes mantenerlo en true, pero el componente DEBE estar en ClientOnly

  vite: {
    optimizeDeps: {
      include: ['three', 'chess.js']
    },
    build: {
      // Aumenta el límite de advertencia de tamaño de chunk
      chunkSizeWarningLimit: 1500,
    }
  },

  // Desactiva el pre-renderizado automático para evitar errores de rutas
  nitro: {
    prerender: {
      crawlLinks: false,
      routes: ['/']
    }
  },

  compatibilityDate: '2024-04-03'
})