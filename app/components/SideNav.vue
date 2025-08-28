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
      />
      <div class="row">
        <small class="hint">
<<<<<<< Updated upstream
          {{ (content || '').length }}/120
=======
          {{ count }}/120
>>>>>>> Stashed changes
          <span v-if="errors.content" class="error">（{{ errors.content }}）</span>
        </small>
        <small v-if="serverError" class="error">{{ serverError }}</small>

        <!-- 送信中のみ無効化。バリデーションは handleSubmit が担当 -->
        <button type="submit" :disabled="isSubmitting" class="btn">
          シェアする
        </button>
      </div>
    </form>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useForm } from 'vee-validate'
import * as yup from 'yup'

const emit = defineEmits<{ (e: 'posted', post: any): void }>()

// スキーマ
const schema = yup.object({
  content: yup.string().trim().required('必須です').max(120, '120文字以内')
})

// defineField を使って “正しい v-model” を得る
const { defineField, errors, handleSubmit, resetForm, isSubmitting } = useForm({
  validationSchema: schema,
  validateOnInput: true,
  initialValues: { content: '' }
})

// v-model + input attrs を同時に取得
const [content, contentAttrs] = defineField<string>('content')

// 画面下部に出す汎用サーバエラー（フィールド以外）
const serverError = ref('')

// 文字数カウント（表示用）
const count = computed(() => graphemeLen(content.value || ''))

const onSubmit = handleSubmit(async (vals) => {
  const { $api } = useNuxtApp()
  try {
    // 認証前の暫定: user_id=1
    const res = await $api.post('/posts', { content: vals.content, user_id: 1 })
    resetForm()
    emit('posted', res.data)       // 作成された投稿を親へ
    serverError.value = ''         // 汎用エラー消去
  } catch (err: any) {
    // 422 のフィールドエラーを VeeValidate 側へ反映
    const payload = err?.response?.data
    const serverErrors = payload?.errors
    if (serverErrors?.content?.length) {
      setFieldError('content', String(serverErrors.content[0]))
    } else {
      serverError.value = payload?.message || '送信に失敗しました'
    }
    // 再throwは任意。デバッグ用途で残すなら下行を有効化
    // throw err
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
