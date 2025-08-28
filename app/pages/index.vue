<template>
  <main class="wrap">
    <SideNav @posted="onPosted" />

    <section class="feed">
      <h1 class="heading">タイムライン</h1>

      <div v-if="loading">読み込み中...</div>
      <div v-else-if="error" class="err">取得に失敗：{{ (error as any)?.message || error }}</div>

      <ul v-else class="list">
        <li v-for="p in posts" :key="p.id" class="item">
          <div class="meta">
            @{{ p.user?.username ?? 'unknown' }} ・ #{{ p.id }}
          </div>

          <p class="body">{{ p.content }}</p>

          <div class="row-bottom">
            <div class="counts">
              💬 {{ p.comments_count ?? p.comments?.length ?? 0 }}
              ❤️ {{ p.likes_count ?? p.likes?.length ?? 0 }}
            </div>
            <!-- いいねボタン-->
            <button class="like" :disabled="p._liking" @click="toggleLike(p)" aria-label="いいねをトグル" title="いいね">
              ❤️ いいね
            </button>
            <!-- ★ 削除ボタン（まずは誰でも表示。後で認可/表示制御） -->
            <button class="danger" @click="deletePost(p.id)">削除</button>
          </div>
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
  _liking?: boolean // ← 楽観更新中のフラグ（UI用）
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
    // 念のため
    fetchPosts()
  }
}

// ★ いいねトグル（楽観更新）
const toggleLike = async (p: Post) => {
  if (p._liking) return
  p._liking = true

  // 現在値を保存（ロールバック用）
  const prev = p.likes_count ?? p.likes?.length ?? 0

  // 楽観的に +1/-1（APIはトグルなので実際の最終値はAPI応答で確認し直しても良い）
  const optimistic = prev + 1 // UI的には「押したら+1」に寄せる
  p.likes_count = optimistic

  try {
    const res = await $api.post(`/posts/${p.id}/likes/toggle`, { user_id: 1})
    // サーバが確定値を返すならそれに更新（返さない場合はコメントアウトでOK）
    if (typeof res.data?.likes_count === 'number') {
      p.likes_count = res.data.likes_count
    }
  } catch (e) {
    // 失敗→ロールバック
    p.likes_count = prev
    console.error(e)
    alert('いいねの更新に失敗しました')
  } finally {
    p._liking = false
  }
}

//削除処理
const deletePost = async (id: number) => {
  //簡易確認(後でモーダルにしてもOK)
  if (!confirm('この投稿を削除しますか？')) return

  const prev = posts.value.slice()
  posts.value = posts.value.filter(p => p.id !== id) //先にUIから消す(楽観)

  try {
    await $api.delete(`/posts/${id}`)
    //サーバ側の整合も取りたいなら再取得(任意)
    //await fetchPosts()
  } catch (e) {
    //失敗したら元に戻す
    posts.value = prev
    alert('削除に失敗しました')
    console.error(e)
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
.row-bottom { margin-top: 8px; display: flex; justify-content: space-between; align-items: center; }
.counts { margin-top: 6px; color: #666; font-size: 13px; }
.danger { padding: 4px 8px; border-radius: 8px; background: #fee; border: 1px solid #f99; color: #900; }
.danger:hover { background: #fdd; }
</style>
