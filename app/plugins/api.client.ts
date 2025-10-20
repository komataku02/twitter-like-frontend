import { getAuth, onAuthStateChanged, signOut, type User } from 'firebase/auth'

const waitForAuthInit = () =>
  new Promise<User | null>((resolve) => onAuthStateChanged(getAuth(), resolve, resolve))

export default defineNuxtPlugin(() => {
  const { public: { apiBase } } = useRuntimeConfig()

  // ofetchインスタンス（全リクエストでIDトークン付与）
  const ofetch = $fetch.create({
    baseURL: apiBase, // .env: NUXT_PUBLIC_API_BASE（例: http://localhost/api/v1）
    async onRequest({ options }) {
      const auth = getAuth()
      let user = auth.currentUser
      if (!user) user = await waitForAuthInit()

      const headers: Record<string, string> = {
        Accept: 'application/json',
        ...(options.headers as any),
      }
      if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`
      options.headers = headers
    },
    // 401時の自動リトライ（トークン強制更新）→失敗なら/loginへ
    async onResponseError({ request, options, response }) {
      if (response?.status === 401) {
        const auth = getAuth()
        const user = auth.currentUser
        if (user) {
          try {
            const fresh = await user.getIdToken(true)
            options.headers = {
              ...(options.headers as any),
              Authorization: `Bearer ${fresh}`,
              Accept: 'application/json',
            }
            return await $fetch.raw(request as any, options as any)
          } catch { /* noop */ }
        }
        try { await signOut(auth) } catch {}
        const router = useRouter()
        router.push('/login')
      }
      throw response
    },
  })

  // axios風ラッパ（常に { data } を返す）
  const wrap = async <T>(input: Parameters<typeof ofetch>[0], opts?: any) => {
    const data = await ofetch<T>(input as any, opts)
    return { data } as { data: T }
  }
  const mapCfg = (cfg?: any) => {
    if (!cfg) return {}
    const { params, headers, ...rest } = cfg
    return { query: params, headers, ...rest } // axiosのparams→ofetchのquery
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
    raw: ofetch, // 必要なら生のofetchも
  }

  if (process.client) (window as any).$api = api // コンソール確認用

  return { provide: { api } }
})
