<template>
  <form class="pc" @submit.prevent="onSubmit">
    <!-- テキスト -->
    <textarea v-model="content" class="pc-textarea" :maxlength="MAX" placeholder="いまどうしてる？（120文字まで）"></textarea>

    <!-- 文字数カウンタ -->
    <div class="pc-counter" :class="{ warn: content.length >= MAX - 10 }">
      {{ content.length }} / {{ MAX }}
    </div>

    <!-- 画像プレビュー（選択後に出る） -->
    <div v-if="previews.length" class="pc-previews">
      <div v-for="(src, i) in previews" :key="src" class="pc-thumb">
        <img :src="src" alt="" />
        <button type="button" class="pc-thumb-x" @click="removeFile(i)" aria-label="画像を外す">×</button>
      </div>
    </div>

    <!-- 画像選択 -->
    <input ref="fileInput" type="file" class="pc-file" accept="image/jpeg,image/png,image/webp,image/gif" multiple
      @change="onPick" />

    <p class="pc-help">画像は最大{{ MAX_FILES }}枚、各{{ MAX_MB }}MBまで（jpg/png/webp/gif）</p>

    <!-- 送信 -->
    <button class="pc-submit" :disabled="posting || isEmpty">
      {{ posting ? '送信中...' : 'シェアする' }}
    </button>
  </form>
</template>

<script setup lang="ts">
const emit = defineEmits<{ (e: 'posted', post?: any): void }>()
const { $api } = useNuxtApp()

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

// プレビューURL（ObjectURL）
const previews = ref<string[]>([])

const isEmpty = computed(
  () => content.value.trim().length === 0 && files.value.length === 0
)

/** files -> previews を再生成（既存URLはrevoke） */
const rebuildPreviews = () => {
  // 既存URL解放
  previews.value.forEach(u => URL.revokeObjectURL(u))
  previews.value = files.value.map(f => URL.createObjectURL(f))
}

const onPick = (e: Event) => {
  const input = e.target as HTMLInputElement
  const picked = Array.from(input.files ?? [])

  // 容量・枚数チェック
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
  // 対応するプレビューURLも消す
  const url = previews.value.splice(i, 1)[0]
  if (url) URL.revokeObjectURL(url)
  // 画像を1枚も選んでいない時の safety
  if (!removed && files.value.length) rebuildPreviews()
}

const onSubmit = async () => {
  if (posting.value || isEmpty.value) return
  posting.value = true

  try {
    const fd = new FormData()
    fd.append('content', content.value)
    files.value.forEach(f => fd.append('images[]', f))
    const res = await $api.post('/posts', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    // 成功：親へ通知＆リセット
    emit('posted', res?.data)
    content.value = ''
    files.value = []
    rebuildPreviews()
  } catch (e: any) {
    alert(e?.response?.data?.message || '投稿に失敗しました')
    console.error(e)
  } finally {
    posting.value = false
  }
}

// ページ離脱時にURL解放
onBeforeUnmount(() => {
  previews.value.forEach(u => URL.revokeObjectURL(u))
})
</script>

<style scoped>
.pc {
  display: grid;
  gap: 8px;
}

.pc *, .pc *::before, .pc *::after {
  box-sizing: border-box;
}

/* テキスト */
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
  box-sizing: border-box;
}

.pc-textarea::placeholder {
  color: #9aa3b2;
}

.pc-textarea:focus {
  border-color: #3a4150;
  box-shadow: 0 0 0 3px rgba(79, 140, 255, .15);
}

/* カウンタ */
.pc-counter {
  text-align: right;
  font-size: 12px;
  color: #9aa3b2;
  line-height: 1;
  margin-top: -2px;
}

.pc-counter.warn {
  color: #ffb3b3;
}

/* 画像プレビュー */
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
  top: 6px;
  right: 6px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1px solid #5d2430;
  background: #3a0f18;
  color: #ffd9df;
  cursor: pointer;
}

/* ファイル・補足 */
.pc-file {
  width: 100%;
  color: #e9edf1;
}

.pc-help {
  margin: 0;
  font-size: 12px;
  color: #9aa3b2;
}

/* 送信ボタン（紫系） */
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
  /* 薄紫 */
  border-color: #a99bf9;
}

.pc-submit:hover:not(:disabled) {
  filter: brightness(1.03);
}
</style>
