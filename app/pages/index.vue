<template>
  <main class="wrap">
    <!-- フォームは SideNav 内に統一 -->
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

          <!-- 画像グリッド（クリックで拡大） -->
          <div v-if="p.images?.length" class="imgs">
            <img v-for="(img, i) in p.images" :key="img.id" :src="fileUrl(img)" class="img" alt=""
              @click="openLightbox(p, i)" style="cursor: zoom-in;" />
          </div>

          <div class="row-bottom">
            <div class="counts">
              💬 {{ p.comments_count ?? p.comments?.length ?? 0 }}
              ❤️ {{ p.likes_count ?? p.likes?.length ?? 0 }}
            </div>
            <NuxtLink :to="`/posts/${p.id}`" class="to-detail" aria-label="コメントへ">
              💬 コメントする
            </NuxtLink>
            <button class="like" :class="{ on: p._liked }" :disabled="p._liking" @click="toggleLike(p)"
              :aria-pressed="p._liked" title="いいね">
              ❤️ {{ p._liked ? 'いいね中' : 'いいね' }}
            </button>
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

    <!-- ライトボックス（画像拡大表示） -->
    <Teleport to="body">
      <div v-if="lbOpen" class="lb" @click.self="closeLightbox">
        <button class="lb-x" @click="closeLightbox" aria-label="閉じる">×</button>
        <button v-if="lbUrls.length > 1" class="lb-nav lb-prev" @click.stop="prevImg" aria-label="前へ">‹</button>
        <img :src="lbUrls[lbIdx]" class="lb-img" alt="">
        <button v-if="lbUrls.length > 1" class="lb-nav lb-next" @click.stop="nextImg" aria-label="次へ">›</button>
      </div>
    </Teleport>
  </main>
</template>

<script setup lang="ts">
import SideNav from '~/components/SideNav.vue'
import { fileUrl } from '@/utils/fileUrl'

type PostImage = { id: number; path?: string; url?: string; width?: number; height?: number }

type Post = {
  id: number
  body?: string
  content: string
  user?: { id?: number; username?: string }
  comments?: any[]
  likes?: any[]
  comments_count?: number
  likes_count?: number
  images?: PostImage[]
  _liking?: boolean
  _liked?: boolean
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

/** API → UI 正規化 */
const normalize = (x: any): Post => {
  const content = x?.content ?? x?.body ?? ''
  const liked = typeof x?._liked === 'boolean' ? x._liked : !!x?.liked
  return {
    ...x,
    content,
    images: Array.isArray(x?.images) ? x.images : [],
    _liked: liked,
    _liking: false,
    comments_count:
      typeof x?.comments_count === 'number'
        ? x.comments_count
        : (Array.isArray(x?.comments) ? x.comments.length : 0),
    likes_count:
      typeof x?.likes_count === 'number'
        ? x.likes_count
        : (Array.isArray(x?.likes) ? x.likes.length : 0),
  }
}

const fetchPosts = async () => {
  loading.value = true
  error.value = null
  try {
    const res = await $api.get('/posts', { params: { _t: Date.now() } })
    const body = res.data as Paginated<any> | any[]
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

const loadMore = async () => {
  if (!nextPageUrl.value || loadingMore.value) return
  loadingMore.value = true
  try {
    const res = await $api.get(nextPageUrl.value)
    const body = res.data as Paginated<any> | any[]
    const chunk = Array.isArray(body) ? body : (body.data ?? [])
    posts.value.push(...chunk.map(normalize))
    nextPageUrl.value = Array.isArray(body) ? null : (body.next_page_url ?? null)
  } finally {
    loadingMore.value = false
  }
}

/** 新規投稿合流（SideNav→PostComposer から受け取る） */
const onPosted = (post?: any) => {
  if (post) {
    posts.value.unshift(normalize(post))
    fetchPosts() // 並びやカウントをサーバ確定値で再同期
  } else {
    fetchPosts()
  }
}

/** いいねトグル */
const toggleLike = async (p: Post) => {
  if (p._liking) return
  p._liking = true
  const prevCount = p.likes_count ?? p.likes?.length ?? 0
  const prevLiked = !!p._liked
  const optimistic = prevLiked ? prevCount - 1 : prevCount + 1
  p.likes_count = Math.max(0, optimistic)
  p._liked = !prevLiked

  try {
    const res = await $api.post(`/posts/${p.id}/likes/toggle`)
    const status = res?.data?.status
    const serverCount = res?.data?.likes_count
    if (typeof serverCount === 'number') p.likes_count = serverCount
    if (status === 'liked') p._liked = true
    if (status === 'unliked') p._liked = false
  } catch (e: any) {
    p.likes_count = prevCount
    p._liked = prevLiked
    const msg = e?.response?.data?.message || 'いいねの更新に失敗しました'
    console.error(e)
    alert(msg)
  } finally {
    p._liking = false
  }
}

/** 削除 */
const deletePost = async (id: number) => {
  if (!confirm('この投稿を削除しますか？')) return
  const prev = posts.value.slice()
  posts.value = posts.value.filter(p => p.id !== id)
  try {
    await $api.delete(`/posts/${id}`)
  } catch (e) {
    posts.value = prev
    alert('削除に失敗しました')
    console.error(e)
  }
}

/** ライトボックス（拡大画像） */
const lbOpen = ref(false)
const lbUrls = ref<string[]>([])
const lbIdx = ref(0)

const openLightbox = (post: Post, i: number) => {
  lbUrls.value = (post.images ?? []).map(img => fileUrl(img))
  lbIdx.value = i
  lbOpen.value = true
  document.addEventListener('keydown', onKey)
}
const closeLightbox = () => {
  lbOpen.value = false
  document.removeEventListener('keydown', onKey)
}
const nextImg = () => {
  if (!lbUrls.value.length) return
  lbIdx.value = (lbIdx.value + 1) % lbUrls.value.length
}
const prevImg = () => {
  if (!lbUrls.value.length) return
  lbIdx.value = (lbIdx.value - 1 + lbUrls.value.length) % lbUrls.value.length
}
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') closeLightbox()
  if (e.key === 'ArrowRight') nextImg()
  if (e.key === 'ArrowLeft') prevImg()
}

onMounted(fetchPosts)
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
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

/* 画像グリッド */
.imgs {
  margin-top: 8px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.imgs .img {
  width: 100%;
  height: 180px;
  object-fit: cover;
  border-radius: 8px;
}

/* 行末操作類 */
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
  background: #fee;
  border: 1px solid #f99;
}

/* ライトボックス */
.lb {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, .85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999
}

.lb-img {
  max-width: 92vw;
  max-height: 92vh;
  box-shadow: 0 10px 30px rgba(0, 0, 0, .6);
  border-radius: 8px
}

.lb-x {
  position: absolute;
  top: 16px;
  right: 20px;
  font-size: 28px;
  color: #fff;
  background: transparent;
  border: none;
  cursor: pointer
}

.lb-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 40px;
  line-height: 1;
  color: #fff;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px 12px
}

.lb-prev {
  left: 16px
}

.lb-next {
  right: 16px
}
</style>
