<template>
  <div class="max-w-sm mx-auto p-6 space-y-4">
    <h1 class="text-xl font-bold">Login / Register</h1>

    <form @submit.prevent="onLogin" class="space-y-2">
      <input v-model="email" type="email" placeholder="email" required class="w-full border p-2" />
      <input v-model="password" type="password" placeholder="password" required class="w-full border p-2" />
      <button class="w-full border p-2">Login</button>
    </form>

    <form @submit.prevent="onRegister" class="space-y-2">
      <input v-model="email" type="email" placeholder="email" required class="w-full border p-2" />
      <input v-model="password" type="password" placeholder="password" required class="w-full border p-2" />
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
    <p v-if="err" class="text-red-600 text-sm mt-2">{{ err }}</p>
  </div>
</template>

<script setup lang="ts">
const email = ref('')
const password = ref('')
const err = ref<string>('')
const { user, ready, login, register, logout } = useFirebaseAuth()
const onLogin = async () => {
  err.value = ''
  try { await login(email.value, password.value) }
  catch (e: any) { err.value = e?.code || e?.message || String(e) }
}
const onRegister = async () => {
  err.value = ''
  try { await register(email.value, password.value) }
  catch (e: any) { err.value = e?.code || e?.message || String(e) }
}
const onLogout = async () => { await logout() }
</script>
