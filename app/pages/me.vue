<!-- app/pages/me.vue -->
<template>
  <NuxtLayout>
    <template #side>
      <SideNav />
    </template>

    <section class="profile">
      <h1 class="heading">プロフィール</h1>

      <!-- ローディング -->
      <div v-if="loading" class="state">読み込み中...</div>

      <!-- エラー -->
      <div v-else-if="error" class="state state--err">
        取得に失敗しました：{{ (error as any)?.message || error }}
      </div>

      <!-- 本体 -->
      <article v-else class="card" v-if="user">
        <header class="header">
          <div class="avatar">
            <span>{{ initials }}</span>
          </div>
          <div class="meta">
            <h2 class="name">
              {{ user.name || '（表示名未設定）' }}
              <span class="username">@{{ user.username || 'no-name' }}</span>
            </h2>
            <p v-if="user.email" class="email">{{ user.email }}</p>
            <p v-if="joinedAt" class="joined">登録日：{{ joinedAt }}</p>
          </div>
        </header>

        <section class="stats" aria-label="アクティビティ概要">
          <div class="stat">
            <span class="stat-label">投稿数</span>
            <span class="stat-value">{{ user.posts_count ?? 0 }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">獲得いいね数</span>
            <span class="stat-value">{{ user.likes_count ?? 0 }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">コメント数</span>
            <span class="stat-value">{{ user.comments_count ?? 0 }}</span>
          </div>
        </section>

        <section class="bio">
          <h3 class="bio-title">自己紹介</h3>
          <p v-if="user.bio" class="bio-body">
            {{ user.bio }}
          </p>
          <p v-else class="bio-body bio-body--empty">
            自己紹介はまだ設定されていません。
          </p>
        </section>

        <!-- 編集フォームトグル -->
        <div class="edit-toggle">
          <button
            v-if="!isEditing"
            class="btn-primary"
            type="button"
            @click="startEdit"
          >
            プロフィールを編集
          </button>
        </div>

        <!-- 編集フォーム -->
        <form v-if="isEditing" class="edit-form" @submit.prevent="submitProfile">
          <div class="field">
            <label for="name">表示名</label>
            <input
              id="name"
              v-model="form.name"
              type="text"
              maxlength="50"
              placeholder="例）山田 太郎"
            />
            <p v-if="fieldErrors.name" class="field-error">{{ fieldErrors.name }}</p>
          </div>

          <div class="field">
            <label for="username">ユーザー名</label>
            <input
              id="username"
              v-model="form.username"
              type="text"
              maxlength="30"
              placeholder="例）user_123"
            />
            <p class="field-hint">@の後ろに表示されます</p>
            <p v-if="fieldErrors.username" class="field-error">{{ fieldErrors.username }}</p>
          </div>

          <div class="field">
            <label for="bio">自己紹介</label>
            <textarea
              id="bio"
              v-model="form.bio"
              rows="3"
              maxlength="160"
              placeholder="自己紹介を入力（160文字まで）"
            />
            <p v-if="fieldErrors.bio" class="field-error">{{ fieldErrors.bio }}</p>
          </div>

          <p v-if="formError" class="form-error">{{ formError }}</p>

          <div class="edit-actions">
            <button class="btn-primary" type="submit" :disabled="saving">
              {{ saving ? '保存中...' : '保存する' }}
            </button>
            <button class="btn-ghost" type="button" @click="cancelEdit" :disabled="saving">
              キャンセル
            </button>
          </div>
        </form>
      </article>
    </section>
  </NuxtLayout>
</template>

<script setup lang="ts">
import SideNav from '~/components/SideNav.vue'

type Profile = {
  id: number
  name?: string | null
  username: string
  email?: string
  bio?: string | null
  posts_count?: number
  likes_count?: number
  comments_count?: number
  created_at?: string
}

const PROFILE_ENDPOINT = '/me'

const { $api } = useNuxtApp()

const user = ref<Profile | null>(null)
const loading = ref(false)
const error = ref<unknown>(null)

const isEditing = ref(false)
const saving = ref(false)
const form = reactive({
  name: '',
  username: '',
  bio: '',
})
const formError = ref('')
const fieldErrors = ref<{ name?: string; username?: string; bio?: string }>({})

// アバター用イニシャル
const initials = computed(() => {
  const base = user.value?.name || user.value?.username || user.value?.email || ''
  if (!base) return '?'
  return base.trim().slice(0, 2).toUpperCase()
})

// 登録日表示
const joinedAt = computed(() => {
  const raw = user.value?.created_at
  if (!raw) return ''

  const d = new Date(raw)
  if (!Number.isFinite(d.getTime())) {
    return ''
  }

  try {
    return d.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
})

const applyProfile = (raw: any): Profile => {
  // { data: {...} } or {...}
  const u = (raw?.data ?? raw) as Profile
  return u
}

const fetchProfile = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await $api.get(PROFILE_ENDPOINT)
    user.value = applyProfile(res.data)
  } catch (e) {
    error.value = e
    console.error('プロフィール取得に失敗', e)
  } finally {
    loading.value = false
  }
}

const startEdit = () => {
  if (!user.value) return
  isEditing.value = true
  form.name = user.value.name ?? ''
  form.username = user.value.username ?? ''
  form.bio = user.value.bio ?? ''
  formError.value = ''
  fieldErrors.value = {}
}

const cancelEdit = () => {
  isEditing.value = false
  formError.value = ''
  fieldErrors.value = {}
}

const submitProfile = async () => {
  if (saving.value || !user.value) return
  saving.value = true
  formError.value = ''
  fieldErrors.value = {}

  try {
    const res = await $api.put(PROFILE_ENDPOINT, {
      name: form.name || null,
      username: form.username || null,
      bio: form.bio || null,
    })
    user.value = applyProfile(res.data)
    isEditing.value = false
  } catch (err: any) {
    const data = err?.response?.data
    const e = (data?.errors ?? {}) as Record<string, string[] | undefined>

    fieldErrors.value = {
      name: e.name?.[0],
      username: e.username?.[0],
      bio: e.bio?.[0],
    }

    if (!fieldErrors.value.name && !fieldErrors.value.username && !fieldErrors.value.bio) {
      formError.value = data?.message || 'プロフィールの更新に失敗しました'
    }

    console.error('プロフィール更新エラー', err)
  } finally {
    saving.value = false
  }
}

onMounted(fetchProfile)
</script>

<style scoped>
.profile {
  display: grid;
  gap: 12px;
  max-width: 820px;
  align-content: start;
  justify-items: start;
}

.heading {
  font-weight: 800;
  font-size: 20px;
  color: var(--text);
}

.state {
  font-size: 14px;
  color: var(--muted);
}

.state--err {
  color: #ff9aa2;
}

.card {
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--panel);
  color: var(--text);
  display: grid;
  gap: 16px;
  max-width: 820px;
  width: 100%;
}

/* ヘッダー（アイコン＋名前周り） */
.header {
  display: flex;
  gap: 12px;
  align-items: center;
}

.avatar {
  width: 52px;
  height: 52px;
  border-radius: 999px;
  background: var(--panel-2);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 18px;
}

.meta {
  display: grid;
  gap: 2px;
}

.name {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: baseline;
}

.username {
  font-size: 13px;
  color: var(--muted);
}

.email,
.joined {
  font-size: 13px;
  color: var(--muted);
}

/* ステータス */
.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.stat {
  min-width: 90px;
  padding: 6px 10px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--panel-2);
  display: grid;
  gap: 2px;
}

.stat-label {
  font-size: 11px;
  color: var(--muted);
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
}

/* 自己紹介 */
.bio {
  display: grid;
  gap: 4px;
}

.bio-title {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
}

.bio-body {
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.bio-body--empty {
  color: var(--muted);
  font-style: italic;
}

/* 編集フォーム */
.edit-toggle {
  margin-top: 4px;
}

.edit-form {
  margin-top: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--border);
  display: grid;
  gap: 10px;
}

.field {
  display: grid;
  gap: 4px;
}

.field label {
  font-size: 13px;
  color: var(--muted);
}

.field input,
.field textarea {
  width: 100%;
  box-sizing: border-box;
  border-radius: 10px;
  border: 1px solid #2a2f39;
  padding: 8px 10px;
  background: #12161e;
  color: #e9edf1;
  font-size: 14px;
}

.field textarea {
  resize: vertical;
}

.field-hint {
  font-size: 11px;
  color: var(--muted);
}

.field-error {
  font-size: 12px;
  color: #ffb3b3;
}

.form-error {
  font-size: 13px;
  color: #ffb3b3;
}

.edit-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* ボタン */
.btn-primary {
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid #7e6bf2;
  background: #9b8cf7;
  color: #0d1020;
  font-weight: 700;
  cursor: pointer;
}
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-ghost {
  padding: 8px 12px;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--panel-2);
  color: var(--text);
}
</style>
