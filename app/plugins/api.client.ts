export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()

  // ofetch($fetch) のインスタンス
  const ofetch = $fetch.create({
    baseURL: config.public.apiBase,
    async onRequest({ options }) {
      try {
        if (process.client) {
          const { getIdToken } = useFirebaseAuth()
          const token = await getIdToken()
          options.headers = { ...(options.headers || {}) }
          if (token) (options.headers as any).Authorization = `Bearer ${token}`
        }
      } catch { /* no-op */ }
    },
  })

  // axios風に薄くラップ（常に { data } を返す）
  const wrap = async <T>(input: Parameters<typeof ofetch>[0], opts?: any) => {
    const data = await ofetch<T>(input as any, opts)
    return { data }
  }

  const mapCfg = (cfg?: any) => {
    if (!cfg) return {}
    const { params, headers, ...rest } = cfg
    // axiosの params → ofetch の query に写し替え
    return { query: params, headers, ...rest }
  }

  const api = {
    get<T = any>(url: string, cfg?: any) {
      return wrap<T>(url, { method: 'GET', ...mapCfg(cfg) })
    },
    post<T = any>(url: string, body?: any, cfg?: any) {
      return wrap<T>(url, { method: 'POST', body, ...mapCfg(cfg) })
    },
    put<T = any>(url: string, body?: any, cfg?: any) {
      return wrap<T>(url, { method: 'PUT', body, ...mapCfg(cfg) })
    },
    delete<T = any>(url: string, cfg?: any) {
      return wrap<T>(url, { method: 'DELETE', ...mapCfg(cfg) })
    },

    // 必要なら生の ofetch も使えるように
    raw: ofetch,
  }

  return { provide: { api } }
})
