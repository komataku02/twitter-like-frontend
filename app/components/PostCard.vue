<script setup lang="ts">
import { fileUrl } from '@/utils/fileUrl'
defineProps<{ post: any }>()
</script>

<template>
  <article>
    <!-- 既存の本文・メタ情報など -->

    <div v-if="post.images?.length" class="mt-2 grid grid-cols-2 gap-2">
      <img v-for="img in post.images" :key="img.id" :src="fileUrl(img)" class="w-full h-48 object-cover rounded" alt="">
    </div>
  </article>
</template>
