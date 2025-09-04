<!-- app/pages/posts/[id].vue -->
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

        <!-- ▼ コメント投稿フォーム -->
        <form class="c-form" @submit.prevent="submitComment">
          <textarea v-model="content" v-bind="contentAttrs" rows="3" name="content" placeholder="コメントを入力(最大120文字)"
            maxlength="120"></textarea>
          <div class="c-row">
            <small class="hint">
              {{ charCount }}/120
              <span v-if="errors.content" class="error">（{{ errors.content }}）</span>
              <span v-else-if="serverError" class="error">（{{ serverError }}）</span>
            </small>
            <button class="btn" type="submit" :disabled="isSubmitting || !meta.valid">コメントする</button>
          </div>
        </form>

        <h2 class="sub">コメント</h2>
        <ul class="list">
          <li v-for="c in comments" :key="c.id" class="item">
            <div class="meta">@{{ c.user?.username ?? 'unknown' }} ・ #{{ c.id }}</div>
            <!-- 👇 自分のコメントだけに削除ボタンを表示（認証導入前は user_id=1 を仮） -->
            <button v-if="c.user?.id === 1" class="danger right" :disabled="c._deleting" @click="deleteComment(c)">
              {{ c._deleting ? '削除中…' : '削除' }}
            </button>
            <p class="body">{{ c.content }}</p>
          </li>
          <li v-if="comments.length === 0" class="muted">まだコメントはありません</li>
        </ul>
      </article>
    </section>
  </main>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { useForm } from 'vee-validate'
import * as yup from 'yup'

type User = { id: number; username?: string }
type Comment = {
  id: number; content: string; user?: { id: number; username?: string }
  _deleting?: boolean //←UI用の一時フラグ
}
type Post = { id: number; content: string; user?: User; comments_count?: number; likes_count?: number }

const route = useRoute()
const { $api } = useNuxtApp()

const post = ref<Post | null>(null)
const comments = ref<Comment[]>([])
const loading = ref(false)
const error = ref<unknown>(null)

/* ▼ コメントフォーム用 ▼ */
const MAX = 120
const graphemeLen = (s: string) => Array.from(s ?? '').length

const schema = yup.object({
  content: yup
    .string()
    .transform(v => (v ?? '').trim())
    .required('必須です')
    .test('len-120', '120文字以内', v => graphemeLen(v ?? '') <= MAX),
})

const {
  defineField,
  handleSubmit,
  resetForm,
  isSubmitting,
  errors,
  meta,
  setFieldError,
} = useForm({
  validationSchema: schema,
  validateOnInput: true,
  initialValues: { content: '' },
})

const [content, contentAttrs] = defineField<string>('content')

// 文字数は computed で一元管理（結合文字対応）
const charCount = computed(() => graphemeLen(content.value || ''))
const serverError = ref<string>('')

const submitComment = handleSubmit(async (vals) => {
  const pid = Number(route.params.id)
  // 楽観更新: 仮コメントを先頭に。負の一時IDで衝突回避
  const optimistic: Comment = {
    id: -Date.now(),
    content: vals.content.trim(),
    user: {id: 1, username: 'you'}
  }
  comments.value.unshift(optimistic)

  try {
    const res = await $api.post(`/posts/${pid}/comments`, {
      content: vals.content,
      user_id: 1, // 認証導入前の暫定
    })
    // 成功 → 仮を確定値に置き換え
    const idx = comments.value.findIndex(c => c.id === optimistic.id)
    if (idx !== -1) comments.value.splice(idx, 1, res.data)
    resetForm()
  } catch (err: any) {
    // 422 などフォームエラー
    const e = err?.response?.data
    if (e?.errors?.content?.[0]) {
      setFieldError('content', String(e.errors.content[0]))
    }
    // ロールバック
    comments.value = comments.value.filter(c => c.id !== optimistic.id)
    alert('コメントの投稿に失敗しました')
    console.error(err)
  }
})
/* ▲ コメントフォーム用 ▲ */
// 投稿詳細 + コメント一覧を取得
const fetchDetail = async () => {
  loading.value = true
  error.value = null
  try {
    const id = Number(route.params.id)

    // 投稿本体を取得(テンプレートリテラル)
    const resPost = await $api.get(`/posts/${id}`)
    post.value = resPost.data

    // コメント一覧を取得
    const resComments = await $api.get(`/posts/${id}/comments`)
    comments.value = Array.isArray(resComments.data?.data) ? resComments.data.data : resComments.data
  } catch (e) {
    error.value = e
  } finally {
    loading.value = false
  }
}

const deleteComment = async (c: Comment) => {
  if (c.deleting) return
  c.deleting = true

  //楽観更新:先にUIから消す
  const prev = comments.value.slice()
  comments.value = comments.value.filter(x => x.id !== c.id)

  try {
    const pid = Number(route.params.id)
    await $api.delete(`/posts/${pid}/comments/${c.id}`)
    //成功なら何もしない(もう消えている)
  } catch (e) {
    //失敗したら戻す
    comments.value = prev
    console.error(e)
    alert('コメントの削除に失敗しました')
  } finally {
    c._deleting = false
  }
}

onMounted(fetchDetail)
</script>

<style scoped>
.wrap {
  max-width: 720px;
  margin: 0 auto;
  padding: 16px;
}

.feed {
  display: grid;
  gap: 12px;
}

.back {
  font-size: 13px;
  color: #06c;
}

.heading {
  font-weight: 700;
  font-size: 18px;
}

.sub {
  margin-top: 16px;
  font-weight: 700;
  font-size: 16px;
}

.err {
  color: #c00;
}

.post,
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

.list {
  display: grid;
  gap: 10px;
  margin-top: 8px;
}

.muted {
  color: #999;
  font-size: 13px;
}

.c-form {
  display: grid;
  gap: 8px;
  margin: 12px 0;
}

.c-form textarea {
  width: 100%;
  box-sizing: border-box;
  resize: vertical;
}

.c-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.btn {
  padding: 6px 12px;
  border-radius: 8px;
}

.btn[disabled] {
  opacity: .5;
  cursor: not-allowed;
}

.hint {
  color: #666;
  font-size: 12px;
}

.error {
  color: #c00;
}

.danger.right {
  float: right;
  margin-left: 8px;
}
</style>
