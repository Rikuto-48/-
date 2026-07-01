# イクマ管理ツール

フィットネスコーチング事業「イクマ」の運営を支援する管理ツール。

- フェーズ①「診断結果ページ」（公開）: 5問診断 → 4タイプ判定 → 結果表示 → LINE登録導線・結果シェア機能
- フェーズ②「見込み客管理」（陸斗さん専用・要ログイン）: 診断タイプ・LINE登録日・進捗ステータス・7日間チャレンジの進捗を一覧管理
- フェーズ③「コンテンツカレンダー」（陸斗さん専用・要ログイン）: 100本リール企画・コンテンツピラー分類・投稿予定日・投稿ステータス・投稿後の実績数値を管理
- フェーズ④「実績ダッシュボード」（陸斗さん専用・要ログイン）: コンテンツピラーごとの平均リーチ・保存率・DM転換率を集計し、効果の高い企画の型を可視化
- フェーズ⑤「今日のLINE配信リスト」（陸斗さん専用・要ログイン）: 見込み客の7日間チャレンジ進捗をもとに、今日送るべきLINEメッセージの文面を自動生成（送信自体は手動。LINE Messaging APIとの自動配信連携は未実装）

いずれも実装済み。スマホ表示前提のレスポンシブUI。

## 技術構成

- フロントエンド: React + TypeScript + Vite
- ルーティング: react-router-dom
- バックエンド/DB/認証: Supabase（診断結果の保存・管理画面ログイン）

## セットアップ

```bash
npm install
cp .env.example .env
# .env に Supabase の URL / anon key、LINE登録リンクを設定する
npm run dev
```

### 環境変数

| 変数名 | 説明 |
| --- | --- |
| `VITE_SUPABASE_URL` | SupabaseプロジェクトのURL |
| `VITE_SUPABASE_ANON_KEY` | Supabaseのanon(公開)キー |
| `VITE_LINE_URL` | 診断結果ページのLINE登録導線リンク先 |

環境変数が未設定の場合でも診断ページ自体は動作するが、診断結果はSupabaseに保存されない。
管理画面（`/admin/*`）はSupabaseが未設定だとログインできない。

### Supabaseのテーブル作成

`supabase/migrations/` 配下のSQLを、Supabaseの SQL Editor で番号順に実行する。

| ファイル | 内容 |
| --- | --- |
| `0001_create_diagnosis_results.sql` | 診断結果テーブル（診断ページから匿名で書き込み可） |
| `0002_create_leads.sql` | 見込み客テーブル（認証ユーザーのみ読み書き可） |
| `0003_create_content_calendar.sql` | コンテンツカレンダーテーブル（認証ユーザーのみ読み書き可） |
| `0004_add_content_metrics.sql` | コンテンツカレンダーに `content_pillar`（企画の型）と投稿後の実績数値（`impressions` / `saves` / `profile_visits` / `dm_count`）を追加 |

### 管理画面ユーザーの作成

Supabaseダッシュボード > Authentication から、陸斗さん用のユーザー（メール+パスワード）を作成する。
アプリ側にサインアップ画面は無く、発行したアカウントで `/admin/login` からログインする運用。

## ディレクトリ構成

```
src/
  data/         診断の設問・タイプ定義、ステータス選択肢、コンテンツピラー、LINEメッセージテンプレート
  lib/          Supabaseクライアント・認証コンテキスト・保存処理・LINE配信キュー算出ロジック
  components/   共通UIコンポーネント(ProtectedRouteなど)
  pages/        診断ページ・結果ページ
  pages/admin/  管理画面(ログイン・見込み客管理・コンテンツカレンダー・実績ダッシュボード・今日のLINE配信リスト)
supabase/
  migrations/   Supabaseのテーブル定義
```

## 今日のLINE配信リストについて

見込み客の `line_registered_at`（LINE登録日）と `challenge_progress`（7日間チャレンジの進捗）から、
その日に送るべきメッセージ（初日ウェルカム・進捗リマインド・励まし・卒業お祝い・再エンゲージメント）の
文面を自動生成して一覧表示する。あくまで文面の下準備までで、LINE公式アカウントへの実際の送信は手動。
LINE Messaging APIとの連携（チャネルアクセストークン発行・Webhook・自動配信バッチ）は未実装。

## 開発コマンド

```bash
npm run dev      # 開発サーバー起動
npm run build    # 本番ビルド
npm run lint     # Lint実行
```
