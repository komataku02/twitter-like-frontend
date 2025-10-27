<template>
  <!-- 未ログイン：CTA を表示 -->
  <div v-if="!authed" class="pc-guest">
    <p class="pc-guest-text">ログインすると投稿できます</p>
    <NuxtLink to="/login" class="pc-login-btn">ログインする</NuxtLink>
  </div>

  <!-- ログイン済み：投稿フォーム -->
  <form v-else class="pc" @submit.prevent="onSubmit">
    <!-- テキスト -->
    <textarea
      v-model="content"
      class="pc-textarea"
      :maxlength="MAX"
      placeholder="いまどうしてる？（120文字まで）"
    ></textarea>

    <!-- 文字数カウンタ -->
    <div class="pc-counter" :class="{ warn: content.length >= MAX - 10 }">
      {{ content.length }} / {{ MAX }}
    </div>

    <!-- 画像プレビュー（選択後） -->
    <div v-if="previews.length" class="pc-previews">
      <div v-for="(src, i) in previews" :key="src" class="pc-thumb">
        <img :src="src" alt="" />
        <button type="button" class="pc-thumb-x" @click="removeFile(i)" aria-label="画像を外す">×</button>
      </div>
    </div>

    <!-- 完全カスタムのファイル選択行（スクリーンリーダー対応で実ファイル入力は視覚的に非表示） -->
    <input
      ref="fileInput"
      type="file"
      class="sr-only-file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      multiple
      @change="onPick"
    />
    <div class="pc-file-row">
      <button type="button" class="pc-file-btn" @click="fileInput?.click()">ファイル選択</button>
      <span class="pc-file-label" aria-live="polite">{{ fileLabel }}</span>
    </div>

    <p class="pc-help">画像は最大{{ MAX_FILES }}枚、各{{ MAX_MB }}MBまで（jpg/png/webp/gif）</p>

    <!-- 送信 -->
    <button class="pc-submit" :disabled="posting || isEmpty">
      {{ posting ? '送信中...' : 'シェアする' }}
    </button>
  </form>
</template>

<script setup lang="ts">
import { getAuth, onAuthStateChanged } from 'firebase/auth'

const emit = defineEmits<{ (e: 'posted', post?: any): void }>()
const { $api } = useNuxtApp()

// ログイン状態
const authed = ref(false)
onMounted(() => {
  const stop = onAuthStateChanged(getAuth(), (u) => {
    authed.value = !!u
  })
  onBeforeUnmount(() => stop())
})

// 制限
const MAX = 120
const MAX_FILES = 4
const MAX_MB = 15
const MAX_BYTES = MAX_MB * 1024 * 1024

// 状態
const content = ref('')
const files = ref<File[]>([])
const posting = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

// プレビューURL
const previews = ref<string[]>([])

// ファイル名ラベル
const fileLabel = computed(() =>
  files.value.length ? files.value.map((f) => f.name).join('、') : '選択されていません'
)

const isEmpty = computed(() => content.value.trim().length === 0 && files.value.length === 0)

/** files -> previews を再生成（既存URLはrevoke） */
const rebuildPreviews = () => {
  previews.value.forEach((u) => URL.revokeObjectURL(u))
  previews.value = files.value.map((f) => URL.createObjectURL(f))
}

const onPick = (e: Event) => {
  const input = e.target as HTMLInputElement
  const picked = Array.from(input.files ?? [])

  const ok: File[] = []
  for (const f of picked) {
    if (f.size > MAX_BYTES) {
      alert(`「${f.name}」は ${MAX_MB}MB を超えています`)
      continue
    }
    ok.push(f)
    if (ok.length + files.value.length >= MAX_FILES) break
  }

  files.value = [...files.value, ...ok].slice(0, MAX_FILES)
  rebuildPreviews()

  // 同じファイルを再選択できるようにクリア
  if (fileInput.value) fileInput.value.value = ''
}

/** 個別削除 */
const removeFile = (i: number) => {
  const removed = files.value.splice(i, 1)[0]
  const url = previews.value.splice(i, 1)[0]
  if (url) URL.revokeObjectURL(url)
  if (!removed && files.value.length) rebuildPreviews()
}

const onSubmit = async () => {
  if (!authed.value) {
    // 念のため二重チェック（URL直叩き等）
    return navigateTo('/login')
  }
  if (posting.value || isEmpty.value) return
  posting.value = true

  try {
    const fd = new FormData()
    fd.append('content', content.value)
    files.value.forEach((f) => fd.append('images[]', f))
    const res = await $api.post('/posts', fd)

    // 成功：親へ通知＆リセット
    emit('posted', res?.data)
    content.value = ''
    files.value = []
    rebuildPreviews()
  } catch (e: any) {
    const msg =
    e?.response?.data?.message ||
    e?.data?.message ||
    e?.message ||
    '投稿に失敗しました'
  alert(msg)
  console.error('POST /posts failed:', e)
  } finally {
    posting.value = false
  }
}

// ページ離脱時にURL解放
onBeforeUnmount(() => {
  previews.value.forEach((u) => URL.revokeObjectURL(u))
})
</script>

<style scoped>
.pc {
  display: grid;
  gap: 8px;
}
.pc *, .pc *::before, .pc *::after { box-sizing: border-box; }

/* --- 未ログイン時 CTA --- */
.pc-guest {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--panel);
}
.pc-guest-text {
  color: #9aa3b2;
  margin: 0;
}
.pc-login-btn {
  display: inline-block;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid #7e6bf2;
  background: #9b8cf7;
  color: #0d1020;
  font-weight: 700;
  text-decoration: none;
  text-align: center;
}
.pc-login-btn:hover { filter: brightness(1.03); }

/* --- テキスト --- */
.pc-textarea {
  width: 100%;
  min-height: 140px;
  padding: 10px 12px;
  border: 1px solid #2a2f39;
  border-radius: 10px;
  outline: none;
  resize: vertical;
  background: #12161e;
  color: #e9edf1;
}
.pc-textarea::placeholder { color: #9aa3b2; }
.pc-textarea:focus {
  border-color: #3a4150;
  box-shadow: 0 0 0 3px rgba(79, 140, 255, .15);
}

/* --- カウンタ --- */
.pc-counter {
  text-align: right;
  font-size: 12px;
  color: #9aa3b2;
  line-height: 1;
  margin-top: -2px;
}
.pc-counter.warn { color: #ffb3b3; }

/* --- プレビュー --- */
.pc-previews {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.pc-thumb {
  position: relative;
  border: 1px solid #2a2f39;
  border-radius: 10px;
  overflow: hidden;
  background: #0f131a;
}
.pc-thumb img {
  display: block;
  width: 100%;
  height: 140px;
  object-fit: cover;
}
.pc-thumb-x {
  position: absolute;
  top: 6px; right: 6px;
  width: 26px; height: 26px;
  border-radius: 50%;
  border: 1px solid #5d2430;
  background: #3a0f18;
  color: #ffd9df;
  cursor: pointer;
}

/* --- 完全カスタムのファイル行 --- */
.sr-only-file {
  position: absolute !important;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0);
  white-space: nowrap; border: 0;
}

.pc-file-row {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 12px;
  width: 100%;
}
.pc-file-btn {
  flex: 0 0 auto;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid #2a2f39;
  background: #7e6bf2;
  color: #0d1020;
  cursor: pointer;
}
.pc-file-btn:hover { filter: brightness(1.05); }

.pc-file-label {
  min-width: 0%;
  font-size: 13px;
  color: #9aa3b2;
  line-height: 1.5;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

/* --- 補足文 --- */
.pc-help {
  margin: 0;
  font-size: 12px;
  color: #9aa3b2;
}

/* --- 送信 --- */
.pc-submit {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid #7e6bf2;
  background: #9b8cf7;
  color: #0d1020;
  font-weight: 700;
  cursor: pointer;
}
.pc-submit:disabled {
  opacity: .6;
  cursor: not-allowed;
  background: #b8affb;
  border-color: #a99bf9;
}
.pc-submit:hover:not(:disabled) { filter: brightness(1.03); }
</style>
