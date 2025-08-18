# SHARE (Twitter風SNS) – Frontend (Nuxt 4)

Nuxt 4 + Pinia + Firebase Authentication + VeeValidate で構成したフロントエンド。

## セットアップ
```bash
cp .env.example .env
# .env を編集（API_BASE/Firebase 設定）

npm install
npm run dev

技術

Nuxt 4 / Vue 3

Pinia

Axios (plugins/axios.ts)

Firebase Auth (Email/Password)

VeeValidate + Yup

開発メモ

API ベースURL: .env の NUXT_PUBLIC_API_BASE

Firebase 設定: .env の NUXT_PUBLIC_FIREBASE_*