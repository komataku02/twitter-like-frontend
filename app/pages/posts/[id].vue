<template>
  <main class="wrap">
    <section class="feed">
      <NuxtLink to="/" class="back">← 戻る</NuxtLink>
      <h1 class="heading">投稿の詳細 / コメント</h1>

      <div v-if="loading">読み込み中...</div>
      <div v-else-if="error" class="err">取得に失敗：{{ (error as any)?.message || error }}</div>

      <article v-else class="post">
        <header class="meta">
          @{{ post?.user?.username ?? 'unknown' }} ・ #{{ post?.id }}
        </header>
        <p class="body">{{ post?.content }}</p>

        <h2 class="sub">コメント</h2>
        <ul class="list">
          <li v-for="c in comments" :key="c.id" class="item">
            <div class="meta">@{{ c.user?.username ?? 'unknown' }} ・ #{{ c.id }}</div>
            <p class="body">{{ c.content }}</p>
          </li>
          <li v-if="comments.length === 0" class="muted">まだコメントはありません</li>
        </ul>
      </article>
    </section>
  </main>
</template>

<script setup lang="ts">
type User = { id: number; username?: string }
type Comment = { id: number; content: string; user?: User }
type Post = { id: number; content: string; user?: User }

const route = useRoute()
const { $api } = useNuxtApp()

const post = ref<Post | null>(null)
const comments = ref<Comment[]>([])
const loading = ref(false)
const error = ref<unknown>(null)

const fetchDetail = async () => {
  loading.value = true
  error.value = null
  try {
    const id = Number(route.params.id)

    // ① 投稿本体（簡易: /posts 一覧から拾う実装でもOK。必要なら /posts/:id を後で追加）
    // ここでは一覧の簡易APIが無い想定なので /posts を取って対象を探す or 省略
    // まずはコメント一覧だけ出す方針にして post は最低限の表示にしておく
    post.value = { id, content: '(本文は後で取得に差し替え)', user: { id: 0, username: 'unknown' } }

    // ② コメント一覧
    const res = await $api.get(`/posts/${id}/comments`)
    // ページネーションで { data: [...] } の場合と、生配列の2パターンに対応
    comments.value = Array.isArray(res.data?.data) ? res.data.data : res.data
  } catch (e) {
    error.value = e
  } finally {
    loading.value = false
  }
}

onMounted(fetchDetail)
</script>

<style scoped>
.wrap { max-width: 720px; margin: 0 auto; padding: 16px; }
.feed { display: grid; gap: 12px; }
.back { font-size: 13px; color: #06c; }
.heading { font-weight: 700; font-size: 18px; }
.sub { margin-top: 16px; font-weight: 700; font-size: 16px; }
.err { color: #c00; }
.post, .item { border: 1px solid #eee; border-radius: 8px; padding: 12px; }
.meta { color: #666; font-size: 13px; }
.body { margin-top: 4px; white-space: pre-wrap; word-break: break-word; }
.list { display: grid; gap: 10px; margin-top: 8px; }
.muted { color: #999; font-size: 13px; }
</style>
