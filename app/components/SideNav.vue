<template>
  <aside class="side">
    <h2 class="title">シェア</h2>

    <form @submit.prevent="onSubmit" class="form">
      <textarea
        v-model="content"
        v-bind="contentAttrs"
        name="content"
        rows="4"
        placeholder="いまどうしてる？"
        class="textarea"
        maxlength="120"
      ></textarea>
      <div class="row">
        <small class="hint">
          {{ Array.from(content || '').length }}/120
          <span v-if="errors.content" class="error">（{{ errors.content }}）</span>
        </small>
        <small v-if="serverError" class="error">{{ serverError }}</small>

        <!-- 送信中のみ無効化。バリデーションは handleSubmit が担当 -->
        <button type="submit" :disabled="isSubmitting || !meta.valid" class="btn">
          シェアする
        </button>
      </div>
    </form>
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useForm } from 'vee-validate'
import * as yup from 'yup'

const emit = defineEmits<{ (e: 'posted', post: any): void }>()

const MAX = 120
const graphemeLen = (s: string) => Array.from(s).length

// スキーマ（トリム + 絵文字等も1文字としてカウント）
const schema = yup.object({
  content: yup
    .string()
    .transform(v => (v ?? '').trim())
    .required('必須です')
    .test('len-120', '120文字以内', (v) => graphemeLen(v ?? '') <= MAX)
})

// defineField で v-model を安全に
const { defineField, errors, handleSubmit, resetForm, isSubmitting, meta, setFieldError } = useForm({
  validationSchema: schema,
  validateOnInput: true,
  initialValues: { content: '' }
})
const [content, contentAttrs] = defineField<string>('content')

// サーバー由来の一般エラー表示用
const serverError = ref<string>('')

const onSubmit = handleSubmit(async (vals) => {
  const { $api } = useNuxtApp()
  try {
    // 認証前の暫定: user_id=1
    const res = await $api.post('/posts', { content: vals.content, user_id: 1 })
    resetForm()
    serverError.value = ''
    emit('posted', res.data) // 親へ通知（タイムライン即時反映）
  } catch (err: any) {
    // 422 のフィールドエラー → VeeValidate に反映
    const e = err?.response?.data
    const fe = e?.errors
    if (fe?.content?.length) {
      setFieldError('content', String(fe.content[0]))
    } else {
      serverError.value = e?.message || '送信に失敗しました'
    }
    // 画面上部に赤エラーが欲しければ throw を残す。不要なら削除可。
    throw err
  }
})
</script>

<style scoped>
.side { max-width: 260px; width: 100%; }
.title { font-weight: 700; margin-bottom: 8px; }
.form { display: grid; gap: 8px; }
.textarea { width: 100%; box-sizing: border-box; resize: vertical; }
.row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.btn { padding: 6px 12px; border-radius: 8px; }
.btn[disabled] { opacity: .5; cursor: not-allowed; }
.hint { color: #666; }
.error { color: #c00; }
</style>
