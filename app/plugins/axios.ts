import axios from 'axios'

export default defineNuxtPlugin(() => {
  const baseURL = process.env.NUXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000/api/v1'
  const api = axios.create({ baseURL, withCredentials: false })

  api.interceptors.response.use(
    (res) => res,
    (err) => {
      console.error('[API Error]', err?.response?.status, err?.response?.data || String(err))
      return Promise.reject(err)
    }
  )

  return { provide: { api } }
})
