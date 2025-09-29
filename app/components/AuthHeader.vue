<template>
  <header class="auth-header">
    <NuxtLink to="/" class="brand">
      <span class="brand-badge">
        <img :src="icons.logo" alt="SHARE" class="brand-logo" />
      </span>
      <span class="brand-text">SHARE</span>
    </NuxtLink>

    <nav class="nav">
      <NuxtLink to="/" class="btn-nav"><img :src="icons.home" class="ic" alt="" /><span>タイムライン</span></NuxtLink>
      <NuxtLink to="/me" class="btn-nav"><img :src="icons.profile" class="ic" alt="" /><span>プロフィール</span></NuxtLink>
      <button type="button" class="btn-nav" @click="logout"><img :src="icons.logout" class="ic"
          alt="" /><span>ログアウト</span></button>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { useAppIcons } from '@/composables/useAppIcons'
const icons = useAppIcons()
const logout = async () => { const { signOut } = useFirebaseAuth(); await signOut(); await navigateTo('/login') }
</script>

<style scoped>
.auth-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  gap: 16px
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: inherit
}

.brand-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: #161a22;
  border: 1px solid #222837
}

.brand-logo {
  width: 24px;
  height: 24px
}

.brand-text {
  font-size: 22px;
  font-weight: 800
}

.nav {
  display: flex;
  gap: 12px;
  align-items: center
}

.btn-nav {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 14px;
  border: 1px solid #222837;
  background: #161a22;
  color: #e9edf1;
  text-decoration: none
}

.btn-nav:hover {
  filter: brightness(1.08)
}

.ic {
  width: 18px;
  height: 18px
}
</style>
