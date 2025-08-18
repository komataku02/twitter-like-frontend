
export default defineNuxtConfig({
  pages: true,
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt'],
  plugins: ['~/plugins/axios'],
})
