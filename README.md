# SHARE – Frontend (Nuxt 4)

Nuxt 4 + Pinia + Firebase Authentication + VeeValidate で作る Twitter風SNS のフロントエンドです。  
バックエンド（Laravel API）と通信して、投稿・いいね・コメントを扱います。

## 📦 スタック
- **Nuxt 4 / Vue 3**
- **Pinia**（状態管理）
- **Axios**（APIクライアント：`plugins/axios.ts`）
- **Firebase Authentication**（Email/Password）
- **VeeValidate + Yup**（フォームバリデーション）
- TypeScript 対応可（必要に応じて拡張）

## 🏗 ディレクトリ構成（抜粋）
frontend/
├─ pages/ # ルーティング（/ , /login , /register , /posts/[id] ...）
├─ components/ # UIコンポーネント（Header, SideNav, Message など）
├─ plugins/
│ └─ axios.ts # $api を提供（baseURL は .env の値を使用）
├─ stores/ # Pinia ストア
├─ public/ # 静的ファイル
└─ nuxt.config.ts


## 🚀 セットアップ（ローカル）

### 前提
- Node.js **18 以上**（推奨：LTS）
- npm または pnpm/yarn（以下は npm 例）

### 1) 依存関係のインストール
```bash
npm install
2) 環境変数を用意
.env.example をコピーして .env を作成し、値を設定します。
cp .env.example .env

.env の例（必要に応じて編集）：
# API ベースURL（Laravel 側）
NUXT_PUBLIC_API_BASE=http://127.0.0.1:8000/api/v1

# Firebase Web Config（Email/Password ログインで使用）
NUXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NUXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NUXT_PUBLIC_FIREBASE_APP_ID=1:xxxxxxxxxxxx:web:yyyyyyyyyyyy

3) 開発サーバ起動
npm run dev
# http://localhost:3000 でアクセス
起動確認：トップページに “Nuxt ⇔ Laravel Health” と、/api/v1/health のレスポンスが表示されればOKです。

4) ビルド
npm run build
npm run preview

🔌 Axios プラグインについて

plugins/axios.ts で $api を提供しています。

baseURL は .env の NUXT_PUBLIC_API_BASE を参照します。

例：const { $api } = useNuxtApp(); await $api.get('/posts');

🔐 Firebase 認証について

Email/Password ログイン／新規登録を利用予定です。

実装時は Firebase Console で Web アプリを作成し、.env の NUXT_PUBLIC_FIREBASE_* を設定します。

🧪 バリデーション

VeeValidate + Yup を使用。

入力必須／文字数制限／形式（メール）など、仕様に基づきスキーマ化。

📝 スクリプト（package.json）

dev：開発サーバ

build：本番ビルド

preview：ビルド済みのプレビュー

🔧 トラブルシュート

画面が白い：ブラウザコンソールとサーバログを確認。pages/ 配下に index.vue があるか、プラグインのパスが正しいかをチェック。

500/404：.env の NUXT_PUBLIC_API_BASE と Laravel 側のポート/パスが一致しているか確認。

CORS：Laravel の config/cors.php で http://localhost:3000 を許可。

