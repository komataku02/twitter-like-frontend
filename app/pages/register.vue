<template>
  <div class="max-w-sm mx-auto p-6 space-y-4">
    <h1 class="text-xl font-bold">新規登録</h1>

    <form @submit.prevent="onRegister" class="space-y-2">
      <input v-model="email" type="email" placeholder="メールアドレス" required class="w-full border p-2" />
      <input v-model="password" type="password" placeholder="パスワード" required class="w-full border p-2" />
      <input v-model="username" type="text" placeholder="ユーザー名（20文字以内）" maxlength="20" required class="w-full border p-2" />
      <button class="w-full border p-2">登録する</button>
    </form>

    <p class="text-sm text-gray-600">
      すでにアカウントがありますか？
      <NuxtLink to="/login" class="underline">ログインはこちら</NuxtLink>
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: false, middleware: ['guest-only'] })
const email = ref('')
const password = ref('')
const username = ref('')

const { register } = useFirebaseAuth()
const { $api } = useNuxtApp()
const router = useRouter()

const onRegister = async () => {
  // Firebaseでサインアップ
  await register(email.value, password.value)

  // バックエンドにプロフィール（username）を即登録
  try {
    await $api.put('/me', { username: username.value })
  } catch (e: any) {
    const msg = e?.response?.data?.message || e?.response?.data?.errors?.username?.[0] || 'プロフィール登録に失敗しました'
    alert(msg)
    return
  }

  // 成功→トップへ
  await router.push('/')
}
</script>

