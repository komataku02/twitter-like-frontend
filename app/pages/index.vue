<template>
  <NuxtLayout>
    <!-- 左サイドへ投稿フォームを差し込み -->
    <template #side>
      <SideNav @posted="onPosted" />
    </template>

    <!-- 右メイン：タイムライン -->
    <section class="feed">
      <h1 class="heading">タイムライン</h1>

      <div v-if="loading">読み込み中...</div>
      <div v-else-if="error" class="err">取得に失敗：{{ (error as any)?.message || error }}</div>

      <ul v-else class="list">
        <li v-for="p in posts" :key="p.id" class="item" :class="tightClass(p)">
          <div class="meta">@{{ p.user?.username ?? 'unknown' }} #{{ p.id }}</div>

          <p v-if="p.content" class="body">{{ p.content }}</p>

          <!-- 画像グリッド（クリックで拡大） -->
          <div v-if="p.images?.length" class="imgs">
            <img v-for="(img, i) in p.images" :key="img.id ?? i" :src="srcThumb(img)" class="img" alt=""
              @click="openLightbox(p, i)" style="cursor: zoom-in;" />
          </div>

          <div class="row-bottom">
            <div class="group-left">
              <!-- いいね -->
              <button class="pill" :disabled="p._liking" @click="toggleLike(p)" aria-label="いいね">
                <img :src="icons.heart" class="ic" alt="" />
                <span>{{ p.likes_count ?? p.likes?.length ?? 0 }}</span>
              </button>

              <!-- コメントページへ -->
              <NuxtLink :to="`/posts/${p.id}`" class="pill" aria-label="コメントへ">
                <img :src="icons.detail" class="ic" alt="" />
                <span>{{ p.comments_count ?? p.comments?.length ?? 0 }}</span>
              </NuxtLink>
            </div>

            <div class="group-right">
              <span class="like-state" :class="{ on: p._liked }">
                <img :src="p._liked ? icons.feather : icons.heart" class="ic" alt="" />
              </span>
              <!-- ×だけで削除 -->
              <button class="btn-x" @click="deletePost(p.id)" aria-label="削除">
                <img :src="icons.cross" class="ic" alt="" />
              </button>
            </div>
          </div>
        </li>
      </ul>

      <div v-if="nextPageUrl" class="more">
        <button :disabled="loadingMore" @click="loadMore">
          {{ loadingMore ? '読み込み中...' : 'もっと見る' }}
        </button>
      </div>
    </section>

    <!-- ライトボックス -->
    <Teleport to="body">
      <div v-if="lbOpen" class="lb" @click.self="closeLightbox">
        <button class="lb-x" @click="closeLightbox" aria-label="閉じる">×</button>
        <button v-if="lbUrls.length > 1" class="lb-nav lb-prev" @click.stop="prevImg" aria-label="前へ">‹</button>
        <img :src="lbUrls[lbIdx]" class="lb-img" alt="">
        <button v-if="lbUrls.length > 1" class="lb-nav lb-next" @click.stop="nextImg" aria-label="次へ">›</button>
      </div>
    </Teleport>
  </NuxtLayout>
</template>

<script setup lang="ts">
import SideNav from '~/components/SideNav.vue'
import { fileUrl } from '@/utils/fileUrl'
import { useAppIcons } from '@/composables/useAppIcons'
const icons = useAppIcons()

type PostImage = { id?: number; path?: string; url?: string; thumb_url?: string; width?: number; height?: number }
type Post = {
  id: number; body?: string; content: string;
  user?: { id?: number; username?: string };
  comments?: any[]; likes?: any[];
  comments_count?: number; likes_count?: number;
  images?: PostImage[]; _liking?: boolean; _liked?: boolean;
}
type Paginated<T> = { data: T[]; next_page_url?: string | null; current_page?: number; last_page?: number }

const { $api } = useNuxtApp()
const posts = ref<Post[]>([])
const loading = ref(false)
const error = ref<unknown>(null)
const nextPageUrl = ref<string | null>(null)
const loadingMore = ref(false)

const srcThumb = (img: PostImage) => img.thumb_url ?? img.url ?? fileUrl(img as any)
const srcFull = (img: PostImage) => img.url ?? fileUrl(img as any)

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
    comments_count: typeof x?.comments_count === 'number' ? x.comments_count : (Array.isArray(x?.comments) ? x.comments.length : 0),
    likes_count: typeof x?.likes_count === 'number' ? x.likes_count : (Array.isArray(x?.likes) ? x.likes.length : 0),
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

/** SideNav から投稿通知を受けたら再読み込み */
const onPosted = (post?: any) => {
  if (post) posts.value.unshift(normalize(post))
  fetchPosts()
}

/** 短文＆画像なしは更にコンパクト */
const tightClass = (p: Post) => {
  const hasImg = Array.isArray(p.images) && p.images.length > 0
  const short = !p.content || p.content.length <= 24
  return { 'item--tight': !hasImg && short }
}

/** いいね */
const toggleLike = async (p: Post) => {
  if (p._liking) return
  p._liking = true
  const prevCount = p.likes_count ?? p.likes?.length ?? 0
  const prevLiked = !!p._liked
  p.likes_count = Math.max(0, prevLiked ? prevCount - 1 : prevCount + 1)
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
    alert(e?.response?.data?.message || 'いいねの更新に失敗しました')
    console.error(e)
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

/** ライトボックス */
const lbOpen = ref(false), lbUrls = ref<string[]>([]), lbIdx = ref(0)
const openLightbox = (post: Post, i: number) => {
  lbUrls.value = (post.images ?? []).map(img => srcFull(img))
  lbIdx.value = i
  lbOpen.value = true
  document.addEventListener('keydown', onKey)
}
const closeLightbox = () => {
  lbOpen.value = false
  document.removeEventListener('keydown', onKey)
}
const nextImg = () => { if (lbUrls.value.length) lbIdx.value = (lbIdx.value + 1) % lbUrls.value.length }
const prevImg = () => { if (lbUrls.value.length) lbIdx.value = (lbIdx.value - 1 + lbUrls.value.length) % lbUrls.value.length }
const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') closeLightbox()
  if (e.key === 'ArrowRight') nextImg()
  if (e.key === 'ArrowLeft') prevImg()
}

onMounted(fetchPosts)
onBeforeUnmount(() => document.removeEventListener('keydown', onKey))
</script>

<style scoped>
.feed {
  display: grid;
  gap: 12px;
  max-width: 820px;
}

.heading {
  font-weight: 800;
  font-size: 20px;
  color: var(--text);
}

.err {
  color: #ff9aa2;
}

/* 行を中身サイズで積む＋余白で伸ばさない */
.list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;
  grid-auto-rows: max-content;
  align-content: start;
  min-height: 0;
  grid-template-columns: minmax(0, 1fr);
}

/* 投稿カード */
.item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--panel);
  color: var(--text);
}

.item--tight {
  padding: 8px 10px;
  gap: 6px;
}

.meta {
  color: var(--muted);
  font-size: 12px;
}

.body {
  margin-top: 2px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 画像グリッド */
.imgs {
  margin-top: 6px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.imgs .img {
  width: 100%;
  height: 150px;
  object-fit: cover;
  border-radius: 8px;
}

/* フッター行（いいね/コメント/削除） */
.row-bottom {
  margin-top: 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.group-left,
.group-right {
  display: flex;
  gap: 10px;
  align-items: center;
}

/* ピルボタン（左側） */
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--panel-2);
  color: var(--text);
  text-decoration: none;
  cursor: pointer;
}

.pill:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.pill:hover {
  filter: brightness(1.08);
}

/* 右側の丸インジケータ＆× */
.ic {
  width: 14px;
  height: 14px;
}

.like-state {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: var(--panel-2);
}

.like-state.on {
  outline: 2px solid color-mix(in srgb, var(--accent) 50%, transparent);
}

.btn-x {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--danger) 55%, var(--border));
  background: color-mix(in srgb, var(--danger) 30%, var(--panel-2));
  color: #ffd9df;
  cursor: pointer;
}

.btn-x:hover {
  filter: brightness(1.08);
}

/* “もっと見る” */
.more>button {
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--panel-2);
  color: var(--text);
  cursor: pointer;
}

.more>button:disabled {
  opacity: .6;
  cursor: not-allowed;
}

.more>button:hover:not(:disabled) {
  filter: brightness(1.05);
}

/* ライトボックス */
.lb {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, .85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.lb-img {
  max-width: 92vw;
  max-height: 92vh;
  box-shadow: 0 10px 30px rgba(0, 0, 0, .6);
  border-radius: 8px;
}

.lb-x {
  position: absolute;
  top: 16px;
  right: 20px;
  font-size: 28px;
  color: #fff;
  background: transparent;
  border: none;
  cursor: pointer;
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
  padding: 8px 12px;
}

.lb-prev {
  left: 16px;
}

.lb-next {
  right: 16px;
}

/* 広い画面では少しコンパクトに */
@media (min-width: 1200px) {
  .imgs .img {
    height: 120px;
  }

  .ic {
    width: 12px;
    height: 12px;
  }

  .like-state {
    width: 24px;
    height: 24px;
  }

  .btn-x {
    width: 26px;
    height: 26px;
  }
}
</style>


