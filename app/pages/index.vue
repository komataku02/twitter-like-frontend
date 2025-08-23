<!-- pages/index.vue -->
<template>
  <main class="wrap">
    <SideNav @posted="onPosted" />

    <section class="feed">
      <h1 class="heading">タイムライン</h1>

      <div v-if="loading">読み込み中...</div>
      <div v-else-if="error" class="err">取得に失敗：{{ (error as any)?.message || error }}</div>

      <ul v-else class="list">
        <li v-for="p in posts" :key="p.id" class="item">
          <div class="meta">@{{ p.user?.username ?? 'unknown' }} ・ #{{ p.id }}</div>
          <p class="body">{{ p.content }}</p>
          <div class="counts">💬 {{ p.comments_count ?? p.comments?.length ?? 0 }}　❤️ {{ p.likes_count ?? p.likes?.length ?? 0 }}</div>
        </li>
      </ul>
    </section>
  </main>
</template>

<script setup lang="ts">
import SideNav from '~/components/SideNav.vue'

type Post = {
  id: number
  content: string
  user?: { id?: number; username?: string }
  comments?: any[]
  likes?: any[]
  comments_count?: number
  likes_count?: number
}

const { $api } = useNuxtApp()
const posts = ref<Post[]>([])
const loading = ref(false)
const error = ref<unknown>(null)

const fetchPosts = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await $api.get('/posts', {params: { _t: Date.now()}})
    posts.value = Array.isArray(res.data?.data) ? res.data.data : res.data
  } catch (e) {
    error.value = e
  } finally {
    loading.value = false
  }
}

// 楽観更新：子から受け取った新規投稿を即座に先頭へ
const onPosted = (post?: Post) => {
  if (post) {
    posts.value.unshift(post)
    // 直後に正規データで再同期（並びやcountの整合を取る）
    fetchPosts()
  } else {

  }
}

onMounted(fetchPosts)
</script>

<style scoped>
.wrap { display: grid; grid-template-columns: 260px 1fr; gap: 24px; max-width: 960px; margin: 0 auto; padding: 16px; }
.feed { display: grid; gap: 12px; }
.heading { font-weight: 700; font-size: 18px; }
.err { color: #c00; }
.list { display: grid; gap: 12px; }
.item { border: 1px solid #eee; border-radius: 8px; padding: 12px; }
.meta { color: #666; font-size: 13px; }
.body { margin-top: 4px; white-space: pre-wrap; word-break: break-word; }
.counts { margin-top: 6px; color: #666; font-size: 13px; }
</style>
