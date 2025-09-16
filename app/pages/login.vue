<template>
  <div class="max-w-sm mx-auto p-6 space-y-4">
    <h1 class="text-xl font-bold">Login / Register</h1>

    <!-- Login -->
    <form @submit.prevent="onLogin" class="space-y-2">
      <input v-model="email" type="email" placeholder="email" required class="w-full border p-2" />
      <input v-model="password" type="password" placeholder="password" required class="w-full border p-2" />
      <button class="w-full border p-2">Login</button>
    </form>

    <!-- Register -->
    <form @submit.prevent="onRegister" class="space-y-2">
      <input v-model="email" type="email" placeholder="email" required class="w-full border p-2" />
      <input v-model="password" type="password" placeholder="password" required class="w-full border p-2" />
      <input v-model="username" type="text" placeholder="username (20文字以内)" maxlength="20" required
        class="w-full border p-2" />
      <button class="w-full border p-2">Register</button>
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

const { user, ready, login, register, logout } = useFirebaseAuth()
const { $api } = useNuxtApp()

const onLogin = async () => {
  await login(email.value, password.value)
  // ついでにプロフィール取得したい場合はコメント解除
  // try { const me = await $api('/me'); console.log('me', me) } catch (e) { console.error(e) }
}

const onRegister = async () => {
  // Firebase でサインアップ
  await register(email.value, password.value)
  // サインアップ直後にプロフィール（username）登録
  try {
    await $api.put('/me', { username: username.value })
    alert('登録が完了しました')
  } catch (e: any) {
    const msg = e?.response?.data?.message || e?.response?.data?.errors?.username?.[0] || 'プロフィール登録に失敗しました'
    alert(msg)
  }
}

const onLogout = async () => { await logout() }
</script>
