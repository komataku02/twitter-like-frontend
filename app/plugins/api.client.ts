// plugins/api.client.ts
import { getAuth, onAuthStateChanged, signOut, type User } from 'firebase/auth'

const waitForAuthInit = () =>
  new Promise<User | null>((resolve) => onAuthStateChanged(getAuth(), resolve, resolve))

export default defineNuxtPlugin(() => {
  const { public: { apiBase } } = useRuntimeConfig()

  // ★ グローバルな「サインアウト中」フラグ
  const signingOut = useState<boolean>('signingOut', () => false)

  const ofetch = $fetch.create({
    baseURL: apiBase,

    async onRequest({ options }) {
      // サインアウト中はヘッダ加工しない
      if (signingOut.value) return

      const toObj = (h: any): Record<string, string> => {
        if (!h) return {}
        if (h instanceof Headers) return Object.fromEntries((h as Headers).entries()) as any
        return { ...(h as Record<string, string>) }
      }

      const headers = toObj(options.headers)
      headers.Accept = headers.Accept ?? 'application/json'

      const auth = getAuth()
      let user = auth.currentUser
      if (!user) user = await waitForAuthInit()

      if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`

      options.headers = headers
      ;(options as any)._retried = (options as any)._retried ?? false
    },

    async onResponseError({ request, options, response }) {
      // サインアウト中は何もしない（遷移は呼び出し側に任せる）
      if (signingOut.value || response?.status !== 401) throw response

      const opt = options as any
      if (opt._retried) {
        // 既に1回リトライ済み→明示ログアウト→/login
        try { await signOut(getAuth()) } catch {}
        const router = useRouter()
        router.push('/login')
        throw response
      }

      try {
        const auth = getAuth()
        const user = auth.currentUser
        if (user) {
          const fresh = await user.getIdToken(true)
          const headers = (options.headers instanceof Headers)
            ? Object.fromEntries((options.headers as Headers).entries())
            : { ...(options.headers as Record<string, string>) }
          headers.Authorization = `Bearer ${fresh}`
          headers.Accept = headers.Accept ?? 'application/json'
          const next = { ...options, headers, _retried: true }
          return await ofetch.raw(request as any, next as any)
        }
      } catch { /* noop */ }

      try { await signOut(getAuth()) } catch {}
      const router = useRouter()
      router.push('/login')
      throw response
    },
  })

  const wrap = async <T>(input: Parameters<typeof ofetch>[0], opts?: any) => {
    const data = await ofetch<T>(input as any, opts)
    return { data } as { data: T }
  }
  const mapCfg = (cfg?: any) => {
    if (!cfg) return {}
    const { params, headers, ...rest } = cfg
    return { query: params, headers, ...rest }
  }

  const api = {
    get<T = any>(url: string, cfg?: any) { return wrap<T>(url, { method: 'GET', ...mapCfg(cfg) }) },
    post<T = any>(url: string, body?: any, cfg?: any) { return wrap<T>(url, { method: 'POST', body, ...mapCfg(cfg) }) },
    put<T = any>(url: string, body?: any, cfg?: any) { return wrap<T>(url, { method: 'PUT', body, ...mapCfg(cfg) }) },
    delete<T = any>(url: string, cfg?: any) { return wrap<T>(url, { method: 'DELETE', ...mapCfg(cfg) }) },
    raw: ofetch,
  }

  if (process.client) (window as any).$api = api
  return { provide: { api } }
})
