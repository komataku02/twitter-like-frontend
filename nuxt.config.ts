// nuxt.config.ts
export default defineNuxtConfig({
  srcDir: 'app',
  pages: true,
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt'],
  runtimeConfig: {
    public: {
      // 既存: Firebase
      firebaseApiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET,

      // 既存: API ベース（※末尾スラッシュなしが安全）
      // 例) http://127.0.0.1:8000/api/v1
      apiBase: process.env.NUXT_PUBLIC_API_BASE
        ?? 'http://127.0.0.1:8000/api/v1',

      // 追加: 画像の /storage 用にオリジンだけ欲しいので用意
      // 例) http://127.0.0.1:8000
      apiBaseOrigin: process.env.NUXT_PUBLIC_API_BASE_ORIGIN
        ?? 'http://127.0.0.1:8000',
    },
  },
})
