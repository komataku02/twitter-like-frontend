export const usePosts = () => {
  const { $api } = useNuxtApp()

  const list = async (page: number = 1) => {
    return await $api(`/v1/posts?page=${page}`)
  }

  const create = async (body: string, files: File[]) => {
    const fd = new FormData()
    if (body) fd.append('body', body)
    for (const f of files) fd.append('images[]', f)
    return await $api('/v1/posts', { method: 'POST', body: fd})
  }
  return { list, create}
}