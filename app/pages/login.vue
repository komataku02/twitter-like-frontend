<!-- app/pages/login.vue -->
<template>
  <div class="max-w-sm mx-auto p-6 space-y-4">
    <h1 class="text-xl font-bold">Login / Register</h1>

    <form @submit.prevent="onLogin" class="space-y-2">
      <input v-model="email" type="email" placeholder="email" required class="w-full border p-2" />
      <input v-model="password" type="password" placeholder="password" required class="w-full border p-2" />
      <button class="w-full border p-2" :disabled="submitting">
        {{ submitting ? '処理中...' : 'Login' }}
      </button>
    </form>

    <form @submit.prevent="onRegister" class="space-y-2">
      <input v-model="email" type="email" placeholder="email" required class="w-full border p-2" />
      <input v-model="password" type="password" placeholder="password" required class="w-full border p-2" />
      <input v-model="username" type="text" placeholder="username (20文字以内)" maxlength="20" required class="w-full border p-2" />
      <button class="w-full border p-2" :disabled="submitting">
        {{ submitting ? '処理中...' : 'Register' }}
      </button>
    </form>

    <div class="pt-2 border-t">
      <button @click="onLogout" class="border p-2 w-full">Logout</button>
    </div>

    <p class="text-sm text-gray-600">
      status:
      <span v-if="!ready">(initializing...)</span>
      <span v-else-if="user">signed in as {{ user.email }}</span>
      <span v-else>signed out</span>
    </p>
  </div>
</template>

<script setup lang="ts">
const email = ref('')
const password = ref('')
const username = ref('')
const submitting = ref(false)

const route = useRoute()
const { user, ready, login, register, logout } = useFirebaseAuth()
const { $api } = useNuxtApp()

const nextPath = computed(() => {
  const q = route.query.next
  return typeof q === 'string' && q.startsWith('/') ? q : '/'
})

const redirecting = ref(false)
watch(
  () => ({ ready: ready.value, user: user.value }),
  async ({ ready, user }) => {
    if (redirecting.value) return
    if (ready && user) {
      redirecting.value = true
      await navigateTo(nextPath.value)
    }
  },
  { immediate: true, deep: true }
)

const onLogin = async () => {
  if (submitting.value) return
  submitting.value = true
  try {
    await login(email.value, password.value)
    await navigateTo(nextPath.value)
  } catch (e: any) {
    alert(e?.message || 'ログインに失敗しました')
    console.error(e)
  } finally {
    submitting.value = false
  }
}

const onRegister = async () => {
  if (submitting.value) return
  submitting.value = true
  try {
    await register(email.value, password.value)
    try {
      await $api.put('/me', { username: username.value })
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.response?.data?.errors?.username?.[0] || 'プロフィール登録に失敗しました'
      alert(msg)
    }
    await navigateTo(nextPath.value)
  } catch (e: any) {
    alert(e?.message || '登録に失敗しました')
    console.error(e)
  } finally {
    submitting.value = false
  }
}

const onLogout = async () => {
  try {
    await logout()
    // ログアウト後はトップへ戻す（好みで /login にしてもOK）
    await navigateTo('/')
  } catch (e) {
    console.error(e)
  }
}
</script>
