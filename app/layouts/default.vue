<template>
  <div class="shell">
    <aside class="side">
      <!-- ページ（index.vue）から #side スロットで差し込む（SideNav を入れる想定） -->
      <slot name="side"></slot>
    </aside>

    <main class="main">
      <!-- ページ本体 -->
      <slot></slot>
    </main>
  </div>
</template>

<script setup lang="ts">
/* スクリプトは不要 */
</script>

<!-- ✅ ページ固有のレイアウト構造用（scoped のまま） -->
<style scoped>
.shell {
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 24px;
  max-width: 1060px;
  margin: 0 auto;
  padding: 16px;
  min-height: 100svh;
  /* 画面全体の高さに気持ちフィット */
}

.side {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.main {
  display: grid;
  gap: 12px;
}

/* モバイルで1カラムに */
@media (max-width: 860px) {
  .shell {
    grid-template-columns: 1fr;
  }

  .side {
    order: 2;
  }

  .main {
    order: 1;
  }
}
</style>

<!-- ✅ テーマ（ダーク配色）は “グローバル” に効かせたいので scoped なし -->
<style>
:root {
  --bg: #161e2a;
  --panel: #121923;
  --panel-2: #161e2a;
  --border: #273245;
  --text: #e9edf1;
  --muted: #a6b0c2;
  --accent: #4f8cff;
  --danger: #a63a4a;
}

html,
body,
#__nuxt {
  height: 100%;
}

body {
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.shell {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  /* ←1fr も収縮OKに */
  gap: 24px;
  max-width: 1060px;
  margin: 0 auto;
  padding: 16px;
}

/* ☆ ここが効きます！ */
aside.side,
main.main {
  min-width: 0;
  /* グリッド子がトラック幅内に収まるように */
}

aside.side>* {
  max-width: 100%;
  /* 子（SideNavやフォーム）もはみ出さない */
  width: 100%;
  box-sizing: border-box;
}

aside.side {
  overflow: hidden;
}

.side {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.side :where(form, section, .pc, .composer) {
  max-width: 100%;
  box-sizing: border-box;
}

.main {
  display: grid;
  gap: 12px;
}

/* モバイル */
@media (max-width: 860px) {
  .shell {
    grid-template-columns: 1fr;
  }

  .side {
    order: 2;
  }

  .main {
    order: 1;
  }
}
</style>

