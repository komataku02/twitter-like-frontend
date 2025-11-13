// composables/useFeedSync.ts
type LikeSnap = { liked?: boolean; likes_count?: number }
type FeedSnap = { comments: Record<number, number>; likes: Record<number, LikeSnap> }

const SS_KEY = 'feed:sync:v1'

const loadFromSS = (): FeedSnap => {
  if (!process.client) return { comments: {}, likes: {} }
  try {
    const raw = sessionStorage.getItem(SS_KEY)
    if (!raw) return { comments: {}, likes: {} }
    const data = JSON.parse(raw)
    return {
      comments: data?.comments ?? {},
      likes: data?.likes ?? {},
    }
  } catch {
    return { comments: {}, likes: {} }
  }
}

const saveToSS = (snap: FeedSnap) => {
  if (!process.client) return
  try {
    sessionStorage.setItem(SS_KEY, JSON.stringify(snap))
  } catch {}
}

export const useFeedSync = () => {
  const snap = useState<FeedSnap>('feed:sync', () => ({ comments: {}, likes: {} }))

  // リロード時に sessionStorage とマージ
  if (process.client) {
    const from = loadFromSS()
    snap.value.comments = { ...from.comments, ...snap.value.comments }
    snap.value.likes    = { ...from.likes,    ...snap.value.likes }
  }

  // ★ 保存 + 変更通知をまとめて行うヘルパー
  const commit = () => {
    saveToSS(snap.value)
    // snap.value 自体を差し替えることで、どんな watch でも確実に反応させる
    snap.value = { ...snap.value }
  }

  // コメント総数（絶対値）の記録
  const noteCommentTotal = (postId: number, total: number | string) => {
    const pid = Number(postId)
    const n = Number(total)
    if (!Number.isFinite(n)) return
    snap.value.comments[pid] = n
    commit()
  }

  // いいね状態（絶対値）の記録
  const noteLikeAbsolute = (postId: number, params: LikeSnap) => {
    const pid = Number(postId)
    const cur = snap.value.likes[pid] ?? {}
    snap.value.likes[pid] = { ...cur, ...params }
    commit()
  }

  const applyToPost = <
    T extends { id: number; comments_count?: number; _liked?: boolean; likes_count?: number }
  >(p: T): T => {
    const pid = Number(p.id)

    const ct = snap.value.comments[pid]
    if (Number.isFinite(ct)) (p as any).comments_count = ct

    const lk = snap.value.likes[pid]
    if (lk) {
      if (typeof lk.liked === 'boolean') (p as any)._liked = lk.liked
      if (Number.isFinite(lk.likes_count!)) (p as any).likes_count = lk.likes_count
    }
    return p
  }

  const applyToList = <T extends { id: number }>(arr: T[]) => arr.map(applyToPost)

  return {
    snap,
    noteCommentTotal,
    noteLikeAbsolute,
    applyToPost,
    applyToList,
  }
}
