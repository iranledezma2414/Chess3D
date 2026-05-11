// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@nuxtjs/tailwindcss'
  ],
  build: {
    transpile: ['three']
  },
  // Desactiva el pre-renderizado para evitar que intente cargar 3D en el servidor
  nitro: {
    prerender: {
      crawlLinks: false,
      routes: []
    }
  }
})