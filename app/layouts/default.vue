<template>
  <div class="shell" :class="{ onecol: !hasSide }">
    <aside class="side" v-if="hasSide">
      <slot name="side" />
    </aside>

    <main class="main">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const slots = useSlots()
const hasSide = computed(() => Boolean(slots.side))
</script>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 24px;
  max-width: 1060px;
  margin: 0 auto;
  padding: 16px;
  min-height: 100svh;
}

/* ← #side が無い時は 1 カラムに */
.shell.onecol {
  grid-template-columns: 1fr;
}

.side { display: flex; flex-direction: column; gap: 16px; }
.main { display: grid; gap: 12px; }

@media (max-width: 860px) {
  .shell { grid-template-columns: 1fr; }
  .side { order: 2; }
  .main { order: 1; }
}
</style>

<!-- グローバルテーマ（scopedなし） -->
<style>
:root {
  --bg: #161e2a; --panel: #121923; --panel-2: #161e2a;
  --border: #273245; --text: #e9edf1; --muted: #a6b0c2;
  --accent: #4f8cff; --danger: #a63a4a;
}
html, body, #__nuxt { height: 100%; }
body { margin:0; background: var(--bg); color: var(--text); -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }

aside.side, main.main { min-width: 0; }
aside.side > * { max-width: 100%; width: 100%; box-sizing: border-box; }
.side :where(form, section, .pc, .composer) { max-width: 100%; box-sizing: border-box; }
</style>
