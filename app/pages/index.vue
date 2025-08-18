<script setup lang="ts">
const nuxtApp = useNuxtApp()
console.log('API baseURL:', nuxtApp.$api?.defaults?.baseURL)
const health = ref<any>(null)
const error = ref('')

onMounted(async () => {
  try {
    const res = await nuxtApp.$api.get('/health')
    health.value = res.data
  } catch (e: any) {
    error.value = e?.message || String(e)
  }
})
</script>

<template>
  <div style="padding:2rem">
    <h1>Nuxt ⇔ Laravel Health</h1>
    <p v-if="error">Error: {{ error }}</p>
    <pre v-else>{{ health }}</pre>
  </div>
</template>
