import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'

const waitForAuth = () =>
  new Promise<User | null>((resolve) => {
    const stop = onAuthStateChanged(
      getAuth(),
      (u) => { stop(); resolve(u) },
      () => { stop(); resolve(null) },
    )
  })

export default defineNuxtRouteMiddleware(async () => {
  // SSR時は何もしない
  if (import.meta.server) return

  const auth = getAuth()
  let u = auth.currentUser
  if (!u) u = await waitForAuth()

  if (!u) {
    const url = useRequestURL()
    return navigateTo(`/login?next=${encodeURIComponent(url.pathname + url.search)}`)
  }
})
