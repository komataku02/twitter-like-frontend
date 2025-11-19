<!-- app/pages/posts/[id].vue -->
<template>
  <NuxtLayout>
    <template #side>
      <SideNav />
    </template>

    <section class="feed">
      <NuxtLink to="/" class="back-pill" aria-label="タイムラインへ戻る">← 戻る</NuxtLink>
      <h1 class="heading">投稿の詳細 / コメント</h1>

      <div v-if="loading">読み込み中...</div>
      <div v-else-if="error" class="err">取得に失敗：{{ (error as any)?.message || error }}</div>

      <article v-else class="card post">
        <header class="meta">
          @{{ post?.user?.username ?? 'unknown' }} ・ #{{ post?.id }}
        </header>

        <!-- 表示モード -->
        <template v-if="!isEditing">
          <p class="body">{{ post?.content }}</p>
          <!-- ★ ログイン中ユーザーの投稿だけ編集ボタン表示 -->
          <button
            v-if="post?.user?.id === me?.id"
            class="btn-primary subtle"
            @click="startEdit"
            aria-label="投稿を編集"
          >
            編集
          </button>
        </template>

        <!-- 編集フォーム -->
        <form v-else class="c-form" @submit.prevent="submitEdit">
          <textarea
            v-model="editContent"
            v-bind="editAttrs"
            rows="3"
            name="content"
            placeholder="本文を編集(最大120文字)"
            maxlength="120"
            class="ta"
          />
          <div class="c-row">
            <small class="hint">
              {{ editCount }}/120
              <span v-if="editErrors.content" class="error">({{ editErrors.content }})</span>
              <span v-else-if="editServerError" class="error">({{ editServerError }})</span>
            </small>
            <div class="actions">
              <button class="btn-primary" type="submit" :disabled="editSubmitting || !editMeta.valid">保存</button>
              <button class="btn-ghost" type="button" @click="cancelEdit" :disabled="editSubmitting">キャンセル</button>
            </div>
          </div>
        </form>

        <!-- コメント投稿フォーム -->
        <form class="c-form" @submit.prevent="submitComment">
          <textarea
            v-model="content"
            v-bind="contentAttrs"
            rows="3"
            name="content"
            placeholder="コメントを入力(最大120文字)"
            maxlength="120"
            class="ta"
          />
          <div class="c-row">
            <small class="hint">
              {{ charCount }}/120
              <span v-if="errors.content" class="error">（{{ errors.content }}）</span>
              <span v-else-if="serverError" class="error">（{{ serverError }}）</span>
            </small>
            <button class="btn-primary" type="submit" :disabled="isSubmitting || !meta.valid">コメントする</button>
          </div>
        </form>

        <h2 class="sub">コメント</h2>

        <ul class="list">
          <li v-for="c in comments" :key="c.id" class="card item">
            <div class="meta">
              @{{ c.user?.username ?? 'unknown' }} ・ #{{ c.id }}
              <!-- ★ 自分のコメントだけ編集&削除ボタン表示 -->
               <button
                v-if="c.user?.id === me?.id"
                class="btn-ghost btn-ghost--sm"
                type="#button"
                :disabled="c._deleteing || c._saving"
                @click="startCommentEdit(c)"
               >
                編集
              </button>

              <button
                v-if="c.user?.id === me?.id"
                class="btn-x right"
                :disabled="c._deleting"
                @click="deleteComment(c)"
                aria-label="コメントを削除"
              >
                <img :src="icons.cross" class="ic" alt="" />
              </button>
            </div>
            <!-- 通常表示 -->
            <p v-if="!c._editing" class="body">{{ c.content }}</p>

            <!-- 編集モード -->
            <div v-else class="c-form">
              <textarea v-model="c._editDraft" rows="2" class="ta" placeholder="コメントを編集(最大120文字)" maxlength="120">
              </textarea>
              <div class="c-row">
                <small class="hint">コメントを編集(最大120文字)</small>
                <div class="actions">
                  <button 
                    class="btn-primary"
                    type="button"
                    :disabled="c._saving"
                    @click="submitCommentEdit(c)"
                    >
                    保存
                  </button>
                  <button
                    class="btn-ghost"
                    type="button"
                    :disabled="c._saving"
                    @click="cancelCommentEdit(c)"
                  >
                  キャンセル
                </button>
                </div>
              </div>
            </div>
          </li>
          <li v-if="comments.length === 0" class="muted">まだコメントはありません</li>
        </ul>

        <div v-if="cNextUrl" class="more">
          <button :disabled="cLoadingMore" @click="loadMoreComments">
            {{ cLoadingMore ? '読み込み中…' : 'もっと見る' }}
          </button>
        </div>
      </article>
    </section>
  </NuxtLayout>
</template>

<script setup lang="ts">
import SideNav from '~/components/SideNav.vue'
import { useRoute } from 'vue-router'
import { useForm } from 'vee-validate'
import * as yup from 'yup'
import { useAppIcons } from '@/composables/useAppIcons'
import { useFeedSync } from '@/composables/useFeedSync'

const icons = useAppIcons()
const feedSync = useFeedSync()

type User   = { id: number; username?: string }
type Comment = { id: number; content: string; user?: User; _deleting?: boolean; _editing?: boolean; _saving?: boolean; _editDraft?: string; }
type Post   = { id: number; content: string; user?: User; comments_count?: number; likes_count?: number }
type Paginated<T> = { data: T[]; next_page_url?: string | null }

const route = useRoute()
const { $api } = useNuxtApp()

const post = ref<Post | null>(null)
const comments = ref<Comment[]>([])
const loading = ref(false)
const error = ref<unknown>(null)
const cLoadingMore = ref(false)
const cNextUrl = ref<string | null>(null)

/** ログイン中ユーザー情報（id / username） */
const me = ref<User | null>(null)

/** /me からログインユーザー情報を取得 */
const fetchMe = async () => {
  try {
    const res = await $api.get('/me')
    const body = res.data as any
    me.value = {
      id: Number(body.id),
      username: body.username ?? undefined,
    }
  } catch (e) {
    console.error('Failed to fetch /me', e)
    me.value = null
  }
}

/** サーバ権威のコメント総数を number で取得（なければ undefined） */
const fetchLatestTotal = async (pid: number): Promise<number | undefined> => {
  try {
    const res = await $api.get(`/posts/${pid}`)
    const body = res.data as any
    // /posts/{id} が { data: {...} } でも {...} でも OK にする
    const p = body?.data ?? body

    const raw =
      typeof p?.comments_count !== 'undefined'
        ? p.comments_count
        : Array.isArray(p?.comments)
          ? p.comments.length
          : undefined

    const n = Number(raw)
    return Number.isFinite(n) ? n : undefined
  } catch {
    return undefined
  }
}

/* ===== コメントフォーム ===== */
const MAX = 120
const graphemeLen = (s: string) => Array.from(s ?? '').length
const schema = yup.object({
  content: yup
    .string()
    .transform(v => (v ?? '').trim())
    .required('必須です')
    .test('len-120', '120文字以内', v => graphemeLen(v ?? '') <= MAX),
})
const { defineField, handleSubmit, resetForm, isSubmitting, errors, meta, setFieldError } = useForm({
  validationSchema: schema,
  validateOnInput: true,
  initialValues: { content: '' },
})
const [content, contentAttrs] = defineField<string>('content')
const charCount = computed(() => graphemeLen(content.value || ''))
const serverError = ref<string>('')

const submitComment = handleSubmit(async (vals) => {
  const pid = Number(route.params.id)

  // ★ 楽観コメントもログイン中ユーザーの情報を使う
  const optimisticUser: User = me.value
    ? { id: me.value.id, username: me.value.username ?? 'you' }
    : { id: 0, username: 'you' }

  const optimistic: Comment = {
    id: -Date.now(),
    content: vals.content.trim(),
    user: optimisticUser,
  }
  comments.value.unshift(optimistic)

  try {
    const res = await $api.post(`/posts/${pid}/comments`, { content: vals.content })
    const idx = comments.value.findIndex(c => c.id === optimistic.id)
    if (idx !== -1) comments.value.splice(idx, 1, res.data)
    resetForm()
    serverError.value = ''

    // サーバ権威の総数を反映（TLにも詳細にも“絶対値”で）
    let total = await fetchLatestTotal(pid)

    // 万一 /posts/{id} から取れなければ、手元のコメント配列長をフォールバックに
    if (!Number.isFinite(total)) {
      total = comments.value.length
    }

    if (Number.isFinite(total)) {
      feedSync.noteCommentTotal(pid, total as number)
      if (post.value) post.value.comments_count = total as number
    }
  } catch (err: any) {
    const e = err?.response?.data
    if (e?.errors?.content?.[0]) setFieldError('content', String(e.errors.content[0]))
    else serverError.value = e?.message || 'コメントの送信に失敗しました'
    comments.value = comments.value.filter(c => c.id !== optimistic.id)
    alert('コメントの投稿に失敗しました')
    console.error(err)
  }
})

/* ===== 投稿詳細 & コメント一覧 ===== */
const fetchDetail = async () => {
  loading.value = true
  error.value = null
  try {
    const id = Number(route.params.id)

    // 投稿本体
    const resPost = await $api.get(`/posts/${id}`)
    const body = resPost.data as any
    const rawPost = body?.data ?? body

    // ★ TL と同じ “確定値” を適用してからセット
    const applied = feedSync.applyToPost(rawPost)
    post.value = applied

    // 初回表示の確定総数もスナップショットへ
    if (typeof applied?.comments_count !== 'undefined') {
      const n = Number(applied.comments_count)
      if (Number.isFinite(n)) feedSync.noteCommentTotal(id, n)
    }

    // コメント一覧
    const resComments = await $api.get(`/posts/${id}/comments`)
    if (Array.isArray(resComments.data)) {
      comments.value = resComments.data
      cNextUrl.value = null
    } else {
      const cBody = resComments.data as Paginated<Comment>
      comments.value = cBody.data
      cNextUrl.value = cBody.next_page_url ?? null
    }
  } catch (e) {
    error.value = e
  } finally {
    loading.value = false
  }
}

const loadMoreComments = async () => {
  if (!cNextUrl.value || cLoadingMore.value) return
  cLoadingMore.value = true
  try {
    const res = await $api.get(cNextUrl.value)
    const body = res.data as Paginated<Comment> | Comment[]
    const chunk = Array.isArray(body) ? body : body.data
    comments.value.push(...chunk)
    cNextUrl.value = Array.isArray(body) ? null : (body.next_page_url ?? null)
  } finally {
    cLoadingMore.value = false
  }
}

const startCommentEdit = (c: Comment) => {
  if (c._deleting) return
  c._editing = true
  c._saving = false
  c._editDraft = c.content
}

const cancelCommentEdit = (c: Comment) => {
  c._editing = false
  c._saving = false
  c._editDraft = c.content
}

const submitCommentEdit = async (c: Comment) => {
  if (c._saving) return

  const pid = Number(route.params.id)
  const text = (c._editDraft ?? '').trim()
  const len = graphemeLen(text)

  //簡単なクライアント側チェック(サーバ側もgrapheme_max:120でバリデーション)
  if (!text || len > MAX) {
    alert('コメントは1〜120文字で入力してください')
    return
  }

  const prev = c.content
  c.content = text
  c._saving = true

  try {
    const res = await $api.put(`/posts/${pid}/comments/${c.id}`, { content: text })
    const updated = res.data as any
    c.content = updated?.content ?? text
    if (updated?.user) c.user = updated.user
    c._editing = false
  } catch (err: any) {
    c.content = prev
    alert(
      err?.response?.data?.errors?.content?.[0] ||
      err?.response?.data.message ||
      'コメントの更新に失敗しました'
    )
    console.error(err)
  } finally {
    c._saving = false
  }
}

const deleteComment = async (c: Comment) => {
  if (c._deleting) return
  c._deleting = true
  const prev = comments.value.slice()
  comments.value = comments.value.filter(x => x.id !== c.id)
  try {
    const pid = Number(route.params.id)
    await $api.delete(`/posts/${pid}/comments/${c.id}`)

    // 削除後もサーバ権威の総数を反映
    let total = await fetchLatestTotal(pid)
    if (!Number.isFinite(total)) {
      total = comments.value.length
    }

    if (Number.isFinite(total)) {
      feedSync.noteCommentTotal(pid, total as number)
      if (post.value) post.value.comments_count = total as number
    }
  } catch (e) {
    comments.value = prev
    console.error(e)
    alert('コメントの削除に失敗しました')
  } finally {
    c._deleting = false
  }
}

/* ===== 編集フォーム ===== */
const editSchema = yup.object({
  content: yup
    .string()
    .transform(v => (v ?? '').trim())
    .required('必須です')
    .test('len-120', '120文字以内', v => graphemeLen(v ?? '') <= MAX),
})
const {
  defineField: defineEditField,
  handleSubmit: handleEditSubmit,
  setFieldError: setEditFieldError,
  resetForm: resetEditForm,
  isSubmitting: editSubmitting,
  errors: editErrors,
  meta: editMeta,
} = useForm({ validationSchema: editSchema, validateOnInput: true, initialValues: { content: '' } })

const [editContent, editAttrs] = defineEditField<string>('content')
const editServerError = ref<string>(''); const isEditing = ref(false)
const editCount = computed(() => graphemeLen(editContent.value || ''))

const startEdit = () => {
  if (!post.value) return
  isEditing.value = true
  resetEditForm({ values: { content: post.value.content } })
  editServerError.value = ''
}
const cancelEdit = () => { isEditing.value = false; editServerError.value = '' }

const submitEdit = handleEditSubmit(async (vals) => {
  if (!post.value) return
  const id = post.value.id
  const prev = post.value.content
  post.value.content = vals.content.trim()
  try {
    const res = await $api.put(`/posts/${id}`, { content: vals.content })
    post.value = res.data
    isEditing.value = false
  } catch (err: any) {
    post.value.content = prev
    const e = err?.response?.data
    if (e?.errors?.content?.[0]) setEditFieldError('content', String(e.errors.content[0]))
    else editServerError.value = e?.message || '保存に失敗しました'
    console.error(err)
  }
})

onMounted(() => {
  fetchMe()      // ★ ログインユーザー情報
  fetchDetail()  // ★ 投稿詳細＋コメント一覧
})
</script>

<style scoped>
/* （CSS はそのまま） */
.feed { display: grid; gap: 8px; align-content: start; justify-items: start; }
.heading { font-size: 18px; line-height: 1.25; margin: 0; }
.err { color: #ff9aa2; }

.card { border: 1px solid var(--border); border-radius: 12px; background: var(--panel); color: var(--text); }
.post { padding: 8px 10px; max-width: 820px; width: 100%; }

/* コメント一覧 */
.sub { margin-top: 16px; font-weight: 700; font-size: 16px; }
.list { display: grid; gap: 8px; margin-top: 6px; max-width: 820px; width: 100%; list-style: none; padding-left: 0; }
.item { padding: 8px 10px; box-sizing: border-box; }
.muted { color: var(--muted); font-size: 13px; }

/* メタ行 */
.meta { color: var(--muted); font-size: 12px; display: flex; align-items: center; gap: 8px; }
.meta .right { margin-left: auto; }

/* 本文 */
.body { margin-top: 6px; line-height: 1.5; white-space: pre-wrap; word-break: break-word; }

/* 戻るピル */
.back-pill {
  display: inline-flex; width: fit-content; max-width: max-content; padding: 4px 8px;
  border-radius: 999px; font-size: 13px; line-height: 1.2;
  border: 1px solid var(--border); background: var(--panel-2); color: var(--text); text-decoration: none;
}
.back-pill:hover { filter: brightness(1.06); }

/* フォーム */
.c-form { display: grid; gap: 8px; margin: 8px 0; }
.ta {
  width: 100%; box-sizing: border-box; resize: vertical; padding: 10px 12px; border-radius: 10px; outline: none;
  border: 1px solid #2a2f39; background: #12161e; color: #e9edf1;
}
.ta::placeholder { color: #9aa3b2; }
.ta:focus { border-color: #3a4150; box-shadow: 0 0 0 3px rgba(79, 140, 255, .15); }

.c-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.hint { color: #9aa3b2; font-size: 12px; }
.error { color: #ffb3b3; }

/* ボタン共通 */
.btn-primary {
  padding: 10px 12px; border-radius: 10px; border: 1px solid #7e6bf2; background: #9b8cf7; color: #0d1020; font-weight: 700; cursor: pointer;
}
.btn-primary:disabled { opacity: .6; cursor: not-allowed; background: #b8affb; border-color: #a99bf9; }
.btn-ghost { padding: 10px 12px; border-radius: 10px; cursor: pointer; border: 1px solid var(--border); background: var(--panel-2); color: var(--text); }
.btn-ghost--sm {
  padding:  4px 8px;
  font-size: 11px;
}

/* ×アイコンボタン（TLと同仕様） */
.ic { width: 14px; height: 14px; }
.btn-x {
  display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--danger) 55%, var(--border));
  background: color-mix(in srgb, var(--danger) 30%, var(--panel-2)); color: #ffd9df; cursor: pointer;
}
.btn-x:disabled { opacity: .6; cursor: not-allowed; }
.btn-x:hover { filter: brightness(1.08); }

/* もっと見る */
.more { margin-top: 8px; display: grid; place-items: center; }
.more>button {
  padding: 8px 12px; border-radius: 10px; cursor: pointer; border: 1px solid var(--border); background: var(--panel-2); color: var(--text);
}
.more>button:disabled { opacity: .6; cursor: not-allowed; }
.more>button:hover:not(:disabled) { filter: brightness(1.05); }
</style>
