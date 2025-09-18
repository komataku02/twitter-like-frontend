<template>
  <aside class="side">
    <h2 class="title">シェア</h2>
    <!-- PostComposer を内包し、posted をそのまま親へバブリング -->
    <PostComposer @posted="p => emit('posted', p)" />
  </aside>
</template>

<script setup lang="ts">
import PostComposer from '~/components/PostComposer.vue'
const emit = defineEmits<{ (e: 'posted', post?: any): void }>()
</script>

<style scoped>
.side {
  max-width: 260px;
  width: 100%;
}

.title {
  font-weight: 700;
  margin-bottom: 8px;
}

/* 内側のフォーム要素をサイド幅に収める */
:deep(textarea),
:deep(input[type="file"]),
:deep(button) {
  width: 100%;
}
</style>
