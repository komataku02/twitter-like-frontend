<template>
  <aside class="side">
    <!-- ロゴ：横長ワードマークをそのまま置く -->
    <NuxtLink to="/" class="brand" aria-label="ホーム">
      <img :src="icons.logo" alt="SHARE" class="brand-logo" />
    </NuxtLink>

    <!-- メニュー -->
    <nav class="menu">
      <NuxtLink to="/" class="menu-btn">
        <img :src="icons.home" class="ic" alt="" />
        <span>タイムライン</span>
      </NuxtLink>

      <NuxtLink to="/me" class="menu-btn">
        <img :src="icons.profile" class="ic" alt="" />
        <span>プロフィール</span>
      </NuxtLink>

      <button type="button" class="menu-btn" @click="onLogout">
        <img :src="icons.logout" class="ic" alt="" />
        <span>ログアウト</span>
      </button>
    </nav>

    <!-- 投稿フォーム -->
    <section class="composer">
      <h2 class="title">シェア</h2>
      <PostComposer @posted="p => emit('posted', p)" />
    </section>
  </aside>
</template>

<script setup lang="ts">
import PostComposer from '~/components/PostComposer.vue'
import { useAppIcons } from '@/composables/useAppIcons'

const icons = useAppIcons()
const emit = defineEmits<{ (e: 'posted', post?: any): void }>()

const onLogout = async () => {
  const { logout } = useFirebaseAuth()
  await logout()
  await navigateTo('/')}
</script>

<style scoped>
.side {
  display: grid;
  gap: 14px;
  max-width: 260px;
  width: 100%;
  align-content: start;
  /* 上詰めで安定 */
}

/* === ロゴ === */
.brand {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  /* ロゴ回りの余白 */
  border-radius: 14px;
  /* ピル形状 */
  background: #11161d;
  /* 暗い背景で白ロゴを際立たせる */
}

.brand-logo {
  height: 28px;
  /* 横長ロゴは高さ基準で調整すると崩れにくい */
  width: auto;
  /* 比率維持 */
  display: block;
  flex-shrink: 0;
}

@media (max-width: 860px) {
  .brand-logo {
    height: 24px;
  }
}

/* === メニュー === */
.menu {
  display: grid;
  gap: 8px;
}

.menu-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid #222837;
  background: #161a22;
  color: #e9edf1;
  text-decoration: none;
  cursor: pointer;
}

.menu-btn:hover {
  filter: brightness(1.08);
}

.ic {
  width: 18px;
  height: 18px;
}

/* === 投稿フォーム === */
.composer {
  display: grid;
  gap: 8px;
}

.title {
  font-weight: 700;
  margin: 6px 0;
}

/* フォーム幅フィット */
:deep(textarea),
:deep(input[type="file"]),
:deep(button) {
  width: 100%;
}
</style>
