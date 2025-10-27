<template>
  <div class="auth-wrap">
    <div class="auth-card">
      <header class="auth-head">
        <img :src="icons.logo" alt="SHARE" class="brand-logo" />
        <h1>新規登録</h1>
      </header>

      <form class="auth-form" @submit.prevent="onRegister" novalidate>
        <label class="auth-field">
          <span>メールアドレス</span>
          <input
            v-model="email"
            type="email"
            inputmode="email"
            autocomplete="username"
            required
            placeholder="you@example.com"
          />
        </label>

        <label class="auth-field">
          <span>パスワード</span>
          <div class="auth-pass">
            <input
              :type="showPass ? 'text' : 'password'"
              v-model="password"
              autocomplete="new-password"
              required
              placeholder="••••••••"
              minlength="6"
            />
            <button type="button" class="ghost" @click="showPass = !showPass" :aria-pressed="showPass">
              {{ showPass ? '隠す' : '表示' }}
            </button>
          </div>
        </label>

        <label class="auth-field">
          <span>ユーザー名（20文字以内）</span>
          <input
            v-model="username"
            type="text"
            maxlength="20"
            required
            placeholder="例）takuya"
          />
        </label>

        <button class="primary" :disabled="submitting">
          <span v-if="!submitting">登録する</span>
          <span v-else class="spinner" aria-label="処理中"></span>
        </button>
      </form>

      <div class="auth-aux">
        <NuxtLink to="/login" class="link">ログインはこちら</NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAppIcons } from '@/composables/useAppIcons'
definePageMeta({ layout: false, middleware: ['guest-only'] })

const icons = useAppIcons()

const email = ref('')
const password = ref('')
const username = ref('')
const submitting = ref(false)
const showPass = ref(false)

const { register } = useFirebaseAuth()
const { $api } = useNuxtApp()

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
      return
    }
    await navigateTo('/')
  } catch (e: any) {
    alert(e?.message || '登録に失敗しました')
    console.error(e)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
/* コンテナ */
.auth-wrap { display:grid; place-items:center; min-height:100svh; padding:24px; }

/* カード */
.auth-card {
  width: min(420px, 92vw);
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
  color: var(--text);
  box-shadow: 0 8px 30px rgba(0,0,0,.25);
}

/* カード内の要素はみ出し防止 */
.auth-card * { box-sizing: border-box; }

/* ヘッダ（ロゴ中央寄せ） */
.auth-head {
  text-align: center;
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
  justify-items: center;
}
.brand-logo {
  display: block;
  margin: 2px auto 0;
  height: 28px;
  width: auto;
}
.auth-head h1 { font-size:20px; margin:0; font-weight:800; }
.auth-sub { margin:0; color:var(--muted); font-size:13px; }

/* フォーム（横幅を少し絞って中央に） */
.auth-form {
  display: grid;
  gap: 12px;
  margin-top: 8px;
  max-width: 360px;
  width: 100%;
  margin-left: auto;
  margin-right: auto;
}

/* フィールド */
.auth-field { display: grid; gap: 6px; }
.auth-field > span { font-size: 12px; color: var(--muted); }
.auth-field input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #2a2f39;
  background: #12161e;
  color: #e9edf1;
  outline: none;
}
.auth-field input:focus { border-color: #3a4150; box-shadow: 0 0 0 3px rgba(79,140,255,.15); }

/* パスワード行 */
.auth-pass { display:flex; gap:8px; align-items:center; }
.auth-pass input { flex:1 1 auto; }
.ghost {
  flex:0 0 auto;
  white-space: nowrap;
  padding:10px 12px;
  border-radius:10px;
  cursor:pointer;
  border:1px solid var(--border);
  background: var(--panel-2);
  color: var(--text);
}

/* ボタン */
.primary {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  cursor: pointer;
  border: 1px solid #7e6bf2;
  background: #9b8cf7;
  color: #0d1020;
  font-weight: 700;
}
.primary:disabled { opacity: .6; cursor: not-allowed; background: #b8affb; border-color: #a99bf9; }

/* ローディング */
.spinner {
  width: 18px; height: 18px;
  border: 2px solid rgba(0,0,0,.2);
  border-top-color: #0d1020;
  border-radius: 50%;
  display: inline-block;
  animation: spin 1s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* 補助リンク */
.auth-aux { margin-top: 10px; text-align: center; }
.link { color: #9b8cf7; text-decoration: underline; }

/* モバイル微調整 */
@media (max-width: 860px) {
  .brand-logo { height: 24px; }
}
</style>
