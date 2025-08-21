<template>
  <main class="max-w-[720px] mx-auto p-4 space-y-4">
    <header class="flex items-center justify-between">
      <h1 class="text-xl font-bold">タイムライン</h1>
      <NuxtLink to="/login" class="underline text-sm">ログイン</NuxtLink>
    </header>

    <!-- ローディング -->
    <div v-if="pending">読み込み中...</div>

    <!-- エラー -->
    <div v-else-if="error" class="text-red-600">
      取得に失敗しました: {{ (error as any).message ?? error }}
    </div>

    <!-- 一覧 -->
    <ul v-else class="space-y-3">
      <li v-for="post in posts" :key="post.id" class="border rounded p-3">
        <div class="text-sm text-gray-500">
          @{{ post.user?.username ?? 'unknown' }} ・ #{{ post.id }}
        </div>
        <p class="mt-1 whitespace-pre-wrap break-words">{{ post.content }}</p>
        <div class="mt-2 text-sm text-gray-600">
          💬 {{ post.comments_count }}　❤️ {{ post.likes_count }}
        </div>
      </li>
    </ul>
  </main>
</template>

<script setup lang="ts">
type UserLite = { id: number; username: string }
type PostItem = {
  id: number
  content: string
  user?: UserLite
  comments_count: number
  likes_count: number
}

const { $api } = useNuxtApp()

// /api/v1/posts は Laravel 側で paginate している想定
// ここでは 1ページ目だけ表示
const { data, pending, error } = await useAsyncData('posts:index', async () => {
  const res = await $api.get('/posts')
  return res.data
})

// Laravel paginate の戻りに合わせて items を取り出す
const posts = computed<PostItem[]>(() => {
  // res.data の形が { data: [...], current_page: 1, ... } 想定
  // もしフラット配列だけ返しているなら data.value をそのまま返す
  if (!data.value) return []
  return Array.isArray(data.value.data) ? data.value.data : data.value
})
</script>

<style scoped>
/* 必要なら簡単なスタイルを足す */
</style>
