<template>
  <NuxtLayout>
    <template #side>
      <SideNav></SideNav>
    </template>

    <section class="profile">
      <h1 class="heading">プロフィール</h1>

      <!--ローディング-->
      <div v-if="loading" class="state">読み込み中...</div>
      <!--エラー-->
      <div v-else-if="error" class="state state--err">
        取得に失敗しました：{{ (error as any)?.message || error }}
      </div>

      <!--本体-->
      <article v-else class="card" v-if="user">
        <header class="header">
          <div class="avatar">
            <span>{{ initials }}</span>
          </div>
          <div class="meta">
            <h2 class="name">@{{ user.username || 'no-name' }}</h2>
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

        <!-- 今後、編集機能をここに足していく -->
        <!-- <button class="btn-primary" type="button">プロフィールを編集</button> -->
      </article>
    </section>
  </NuxtLayout>
</template>

<script setup lang="ts">
import SideNav from '~/components/SideNav.vue';

type Profile = {
  id: number
  username: string
  email?: string
  bio?: string | null
  posts_count?: number
  likes_count?: number
  comments_count?: number
  created_st?: string
}

//バックエンドの実装に合わせてここだけ変えればOK
// 例)/api/user, /profile/me などにしてもよい
const PROFILE_ENDPOINT = '/me'

const { $api } = useNuxtApp()

const user = ref<Profile | null>(null)
const loading = ref(false)
const error = ref<unknown>(null)

//名前やメールからイニシャルを作る(アバター丸の中の文字)
const initials = computed(() => {
  const base = user.value?.username || user.value?.email || ''
  if (!base) return '?'
  //ひとまず先頭の2文字だけ切り出し(日本語でもOK)
  return base.trim().slice(0, 2).toUpperCase()
})

//created_atがあれば「いつから利用しているか」を表示
const joinedAt = computed(() => {
  const raw = user.value?.created_at
  if (!raw) return ''

  // Date に変換
  const d = new Date(raw)
  if (!Number.isFinite(d.getTime())) {
    // 変な文字列が来た場合は何も表示しない
    return ''
  }

  try {
    // 通常はこちらを使う（日本語表記）
    return d.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch (e) {
    // もし環境依存で toLocaleDateString がコケたら、素直に "YYYY-MM-DD" で返す
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
})

const fetchProfile = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await $api.get(PROFILE_ENDPOINT)
    const body = res.data as any
    //{ data: {...} } or {...}どちらにも対応しておく
    user.value = (body?.data ?? body) as Profile
  } catch (e) {
    error.value = e
    console.error('プロフィールの取得に失敗', e)
  } finally {
    loading.value = false
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
}

.email,
.joined {
  font-size: 13px;
  color: var(--muted);
}

/* ステータス（投稿数など） */
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

/* そのうち編集ボタンを置く想定 */
.btn-primary {
  margin-top: 8px;
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
</style>