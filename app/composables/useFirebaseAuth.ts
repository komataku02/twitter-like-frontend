// composables/useFirebaseAuth.ts
import {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth'
import type { User } from 'firebase/auth'

export const useFirebaseAuth = () => {
  const { $auth } = useNuxtApp()

  // 状態
  const user = useState<User | null>('auth:user', () => null)
  const ready = useState<boolean>('auth:ready', () => false)
  const inited = useState<boolean>('auth:inited', () => false)

  // ★ api.client.ts と共有する「サインアウト中」フラグ
  const signingOut = useState<boolean>('signingOut', () => false)

  // 初期化（多重購読防止）
  if (process.client && !inited.value) {
    inited.value = true
    onAuthStateChanged($auth, (u) => {
      user.value = u
      ready.value = true
    })
  }

  // 認証API
  const register = (email: string, password: string) =>
    createUserWithEmailAndPassword($auth, email, password)

  const login = async (email: string, password: string) => {
    const cred = await signInWithEmailAndPassword($auth, email, password)
    // ここで画面遷移するならコメント解除
    // await navigateTo('/')
    return cred
  }

  const logout = async () => {
    // 競合防止：サインアウト中は多重実行しない
    if (signingOut.value) return
    signingOut.value = true
    try {
      await signOut($auth)
      await navigateTo('/')
    } finally {
      // 遷移後の保険も兼ねて戻す
      signingOut.value = false
    }

    const signOutCompat = logout

    return {
      user, ready, register, login, logout, getIdToken, signingOut,
      signOut: signOutCompat
    }
  }

  const getIdToken = async () => (user.value ? await user.value.getIdToken() : null)

  return { user, ready, register, login, logout, getIdToken, signingOut }
}
