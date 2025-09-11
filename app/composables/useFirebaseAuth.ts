import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import type { User } from 'firebase/auth'

export const useFirebaseAuth = () => {
  const { $auth } = useNuxtApp()
  const user = useState<User | null>('auth:user', () => null)
  const ready = useState<boolean>('auth:ready', () => false)
  const inited = useState<boolean>('auth:inited', () => false)

  if (process.client && !ready.value) {
    onAuthStateChanged($auth, (u) => { user.value = u; ready.value = true })
  }

  const register = (email: string, password: string) =>
    createUserWithEmailAndPassword($auth, email, password)
  const login = (email: string, password: string) =>
    signInWithEmailAndPassword($auth, email, password)
  const logout = () => signOut($auth)
  const getIdToken = async () => user.value ? await user.value.getIdToken() : null

  return { user, ready, register, login, logout, getIdToken }
}
