export const fileUrl = (img: { url?: string; path?: string }) => {
  if (img?.url) return img.url;
  const { public: cfg } = useRuntimeConfig();
  const origin = new URL(cfg.apiBase).origin; // 例: http://127.0.0.1:8000
  return new URL(`/storage/${img.path}`, origin).toString();
};
