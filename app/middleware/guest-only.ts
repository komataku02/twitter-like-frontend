export default defineNuxtRouteMiddleware(async () => {
  const { user, ready } = useFirebaseAuth()
  if (!ready.value) {
    await new Promise<void>((resolve) => {
      const stop = watch(ready, (v) => { if (v) { stop(); resolve() } })
    })
  }
  if (user.value) return navigateTo('/')
})