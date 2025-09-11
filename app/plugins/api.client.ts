export default defineNuxtPlugin(() => {
  const api = $fetch.create({
    baseURL: useRuntimeConfig().public.apiBase,
    async onRequest({ options }) {
      const { getIdToken } = useFirebaseAuth()
      const token = await getIdToken()
      options.headers = { ...(options.headers || {}) }
      if (token) (options.headers as any).Authorization = `Bearer ${token}`
    },
  })
  return { provide: { api } }
})
