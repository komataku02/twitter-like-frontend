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
          <!-- 受信データは body or content を正規化して p.content に寄せる -->
          <p class="body">{{ p.content }}</p>

          <div class="row-bottom">
            <div class="counts">
              💬 {{ p.comments_count ?? p.comments?.length ?? 0 }}
              ❤️ {{ p.likes_count ?? p.likes?.length ?? 0 }}
            </div>
            <!-- コメントリンク -->
            <NuxtLink :to="`/posts/${p.id}`" class="to-detail" aria-label="コメントへ">
              💬 コメントする
            </NuxtLink>
            <!-- いいねボタン-->
            <button class="like" :class="{ on: p._liked }" :disabled="p._liking" @click="toggleLike(p)"
              :aria-pressed="p._liked" title="いいね">
              ❤️ {{ p._liked ? 'いいね中' : 'いいね' }}
            </button>
            <!-- ★ 削除ボタン（まずは誰でも表示。後で認可/表示制御） -->
            <button class="danger" @click="deletePost(p.id)">削除</button>
          </div>
        </li>
      </ul>
      <div v-if="nextPageUrl" class="more">
        <button :disabled="loadingMore" @click="loadMore">
          {{ loadingMore ? '読み込み中...' : 'もっと見る' }}
        </button>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import SideNav from '~/components/SideNav.vue'

type Post = {
  id: number
  body?: string
  content: string
  user?: { id?: number; username?: string }
  comments?: any[]
  likes?: any[]
  comments_count?: number
  likes_count?: number
  _liking?: boolean // ← 楽観更新中のフラグ（UI用）
  _liked?: boolean // ←ローカルの「自分がいいね済み」状態
}

type Paginated<T> = {
  data: T[]
  next_page_url?: string | null
  current_page?: number
  last_page?: number
}

const { $api } = useNuxtApp()
const posts = ref<Post[]>([])
const loading = ref(false)
const error = ref<unknown>(null)
const nextPageUrl = ref<string | null>(null)
const loadingMore = ref(false)

/** 受信レコードをUI用に正規化(body/contentの差異やUIフラグを補完) */
const normalize = (x: any): Post => {
  const content = x?.content ?? x?.body ?? ''
  const liked = typeof x?._liked === 'boolean' ? x.liked : !!x?.liked //APIがlikedを返す場合の保険
  return {
    ...x,
    content,
    _liked: liked,
    _liking: false,
    comments_count: typeof x?.comments_count === 'number' ? x.comments_count : (Array.isArray(x?.comments) ? x.comments.length : 0),
    likes_count: typeof x?.likes_count === 'number' ? x.likes_count : (Array.isArray(x?.likes) ? x.likes.length : 0),
  }
}

const fetchPosts = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await $api.get('/posts', { params: { _t: Date.now() } })
    const body = res.data as Paginated<any> |  any[]
    if (Array.isArray(body)) {
      posts.value = body.map(normalize)
      nextPageUrl.value = null
    } else {
      posts.value = (body.data ?? []).map(normalize)
      nextPageUrl.value = body.next_page_url ?? null
    }
  } catch (e) {
    error.value = e
  } finally {
    loading.value = false
  }
}

//もっと見るを追加
const loadMore = async () => {
  if (!nextPageUrl.value || loadingMore.value) return
  loadingMore.value = true
  try {
    // next_page_url はフルURLなので、そのまま叩ける
    const res = await $api.get(nextPageUrl.value)
    const body = res.data as Paginated<any> |  any[]
    const chunk = Array.isArray(body) ? body : (body.data ?? [])
    posts.value.push(...chunk.map(normalize))
    nextPageUrl.value = Array.isArray(body) ? null : (body.next_page_url ?? null)
  } finally {
    loadingMore.value = false
  }
}

// 楽観更新：子から受け取った新規投稿を即座に先頭へ
const onPosted = (post?: any) => {
  if (post) {
    posts.value.unshift(normalize(post))
    fetchPosts()//並び・カウントの整合を取り直す
  } else {
    // 念のため
    fetchPosts()
  }
}

// ★ いいねトグル（サーバー確定値で上書き）
const toggleLike = async (p: Post) => {
  if (p._liking) return
  p._liking = true

  // 現在値を保存（ロールバック用）
  const prevCount = p.likes_count ?? p.likes?.length ?? 0
  const prevLiked = !!p._liked

  // 楽観更新：状態に応じて +1 / -1
  const optimistic = prevLiked ? prevCount - 1 : prevCount + 1
  p.likes_count = Math.max(0, optimistic)
  p._liked = !prevLiked

  try {
    //認証トークンで識別できるのでuser_idは不要
    const res = await $api.post(`/posts/${p.id}/likes/toggle`)
    // サーバ確定値で上書き
    const status = res?.data?.status
    const serverCount = res?.data?.likes_count
    if (typeof serverCount === 'number') p.likes_count = serverCount
    if (status === 'liked') p._liked = true
    if (status === 'unkiked') p._liked = false
  } catch (e: any) {
    // 失敗→ロールバック
    p.likes_count = prevCount
    p._liked = prevLiked
    const msg = e?.response?.data?.message || 'いいねの更新に失敗しました'
    console.error(e)
    alert(msg)
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
.wrap {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 24px;
  max-width: 960px;
  margin: 0 auto;
  padding: 16px;
}

.feed {
  display: grid;
  gap: 12px;
}

.heading {
  font-weight: 700;
  font-size: 18px;
}

.err {
  color: #c00;
}

.list {
  display: grid;
  gap: 12px;
}

.item {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 12px;
}

.meta {
  color: #666;
  font-size: 13px;
}

.body {
  margin-top: 4px;
  white-space: pre-wrap;
  word-break: break-word;
}

.row-bottom {
  margin-top: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.counts {
  margin-top: 6px;
  color: #666;
  font-size: 13px;
}

.danger {
  padding: 4px 8px;
  border-radius: 8px;
  background: #fee;
  border: 1px solid #f99;
  color: #900;
}

.danger:hover {
  background: #fdd;
}

.to-detail {
  margin-left: 8px;
  font-size: 13px;
  color: #06c;
}

.to-detail:hover {
  text-decoration: underline;
}

.like.on {
  background: #fee; border: 1px solid #f99;
}
</style>
