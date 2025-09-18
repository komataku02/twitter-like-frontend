<script setup lang="ts">
import { ref, computed, onBeforeUnmount } from 'vue'

const { $api } = useNuxtApp()
const emit = defineEmits<{ (e: 'posted', post?: any): void }>()

const MAX_FILES = 4
const MAX_SIZE_MB = 15                  // ★ クライアント側の上限(表示/事前チェック用)
const MAX_SIZE = MAX_SIZE_MB * 1024 * 1024
const ACCEPTS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']

const content = ref('')
const files = ref<File[]>([])
const previews = ref<string[]>([])
const posting = ref(false)
const fileInput = ref<HTMLInputElement | null>(null) // ★ 追加

const canSubmit = computed(() => content.value.trim().length > 0 || files.value.length > 0)

const syncNativeInput = () => { // ★ input の表示と選択状態を同期
  const el = fileInput.value
  if (!el) return
  try {
    const dt = new DataTransfer()
    for (const f of files.value) dt.items.add(f)
    // @ts-ignore
    el.files = dt.files
    if (files.value.length === 0) el.value = ''
  } catch {
    // Safari等のfallback
    el.value = ''
  }
}

const addFiles = (list: FileList | null) => {
  if (!list) return
  const next = [...files.value]
  for (const f of Array.from(list)) {
    if (!ACCEPTS.includes(f.type)) { alert('対応外の画像形式です'); continue }
    if (f.size > MAX_SIZE) { alert(`${MAX_SIZE_MB}MBを超えています`); continue }
    if (next.length >= MAX_FILES) { alert('画像は最大4枚までです'); break }
    next.push(f)
  }
  files.value = next
  rebuildPreviews()
  syncNativeInput() // ★
}

const removeAt = (i: number) => {
  files.value.splice(i, 1)
  rebuildPreviews()
  syncNativeInput() // ★
}

const rebuildPreviews = () => {
  previews.value.forEach(u => URL.revokeObjectURL(u))
  previews.value = files.value.map(f => URL.createObjectURL(f))
}
onBeforeUnmount(() => previews.value.forEach(u => URL.revokeObjectURL(u)))

const submit = async () => {
  if (!canSubmit.value) { alert('本文または画像のいずれかは必須です'); return }
  posting.value = true
  try {
    const form = new FormData()
    form.append('content', content.value)
    for (const f of files.value) form.append('images[]', f)

    const res = await $api.post('/posts', form) // pluginは {data} 返却
    const createdPost = res?.data ?? null

    // リセット
    content.value = ''
    files.value = []
    rebuildPreviews()
    syncNativeInput() // ★ input表示も空に

    emit('posted', createdPost)
  } catch (e: any) {
    console.error(e)
    alert(e?.response?.data?.message ?? '送信に失敗しました')
  } finally {
    posting.value = false
  }
}
</script>

<template>
  <form @submit.prevent="submit" class="space-y-3">
    <textarea v-model="content" maxlength="120" placeholder="いまどうしてる？（120文字まで）"
      class="w-full border rounded p-2"></textarea>

    <div>
      <input ref="fileInput" type="file" multiple accept=".jpg,.jpeg,.png,.webp,.gif"
        @change="addFiles(($event.target as HTMLInputElement).files)" />
      <p class="text-sm text-gray-500">
        画像は最大4枚、各{{ MAX_SIZE_MB }}MBまで（jpg/png/webp/gif）
      </p>
    </div>

    <client-only>
      <div v-if="previews.length" class="previewGrid">
        <div v-for="(src, i) in previews" :key="i" class="thumb">
          <img :src="src" alt="">
          <button type="button" class="del" @click="removeAt(i)">削除</button>
        </div>
      </div>
    </client-only>

    <button :disabled="!canSubmit || posting" class="submitBtn">
      {{ posting ? '投稿中…' : 'シェアする' }}
    </button>
  </form>
</template>

<style scoped>
.previewGrid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
  margin-top: 8px
}

.thumb {
  position: relative
}

.thumb img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  border-radius: 8px;
  display: block
}

.del {
  position: absolute;
  top: 6px;
  right: 6px;
  font-size: 12px;
  padding: 2px 6px;
  color: #fff;
  background: rgba(0, 0, 0, .6);
  border-radius: 6px
}

.submitBtn {
  width: 100%;
  padding: 8px 12px;
  border-radius: 8px;
  color: #fff;
  background: #2563eb
}

.submitBtn[disabled] {
  opacity: .5;
  cursor: not-allowed
}
</style>
