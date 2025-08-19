# SHARE – Frontend (Nuxt 4)

Twitter風SNS風アプリ「SHARE」のフロントエンドです。  
Nuxt 4 をベースに、状態管理（Pinia）、フォームバリデーション（VeeValidate + Yup）、Firebase認証を利用して構築しました。  
バックエンド（Laravel API）と連携し、投稿・いいね・コメント機能を扱います。

< --- トップ画面の画像 ---- >

---

## 作成した目的
- フロントエンド（Nuxt 4 / Vue 3）とバックエンド（Laravel API）の連携を学習するため  
- 実務で利用する技術スタック（認証、バリデーション、状態管理）の習得  
- ポートフォリオとしてSNS風アプリを完成させ、フロントエンド・バックエンド一貫で開発できることを示すため  

---

## アプリケーションURL
- 開発環境: http://localhost:3000
- 注意事項: Firebase Authentication を利用しているため、動作確認には Firebase プロジェクトの設定が必要です  

---

## 他のリポジトリ
- [バックエンド（Laravel API）リポジトリ](https://github.com/komataku02/twitter-like-backend)

---

## 機能一覧
- ユーザー登録 / ログイン（Firebase Authentication）  
- 投稿の作成 / 一覧 / 詳細表示  
- いいね機能  
- コメント機能  
- バリデーション（VeeValidate + Yup）  
- ユーザーステータス管理（Pinia）  

---

## 使用技術（実行環境）
- Nuxt 4 (Vue 3)  
- Pinia（状態管理）  
- Axios（API通信 / plugins/axios.ts）  
- Firebase Authentication（Email/Password 認証）  
- VeeValidate + Yup（フォームバリデーション）  
- Node.js v18（開発環境）  

---

## テーブル設計
< --- 作成したテーブル設計の画像 ---- >

---

## ER図
< --- 作成したER図の画像 ---- >

---

## 環境構築

### 前提
- Node.js v18以上  
- npm / pnpm / yarn（以下は npm 例）

### 1) リポジトリをクローン
```
git clone https://github.com/komatuku02/twitter-like-frontend.git
cd twitter-like-frontend
```
### 2)依存関係をインストール
```
npm install
```
### 3)環境変数を設定
```
cp .env.example .env
```
### .envの例
```
# API ベースURL（Laravel 側）
NUXT_PUBLIC_API_BASE=http://127.0.0.1:8000/api/v1

# Firebase Web Config（Email/Password ログインで使用）
NUXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NUXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NUXT_PUBLIC_FIREBASE_APP_ID=1:xxxxxxxxxxxx:web:yyyyyyyyyyyy
```
### 4)開発サーバー起動
```
npm run dev
```
ブラウザでhttp://localhost:3000にアクセス。

### 5)ビルド＆プレビュー
```
npm run build
npm run preview
```

