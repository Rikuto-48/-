# イクマ管理ツール

フィットネスコーチング事業「イクマ」の運営を支援する管理ツール。

現在はフェーズ①「診断結果ページ」を実装済み。
5問診断 → 4タイプ判定 → 結果表示 → LINE登録導線、という流れをスマホ表示前提で提供する。

## 技術構成

- フロントエンド: React + TypeScript + Vite
- ルーティング: react-router-dom
- バックエンド/DB: Supabase（診断結果の保存）

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

### Supabaseのテーブル作成

`supabase/migrations/0001_create_diagnosis_results.sql` を Supabase の SQL Editor で実行し、
`diagnosis_results` テーブルを作成する。

## ディレクトリ構成

```
src/
  data/         診断の設問・タイプ定義
  lib/          Supabaseクライアント・保存処理
  components/   共通UIコンポーネント
  pages/        診断ページ・結果ページ
supabase/
  migrations/   Supabaseのテーブル定義
```

## 今後のフェーズ

- 見込み客管理（陸斗さん専用・要認証）
- コンテンツカレンダー（陸斗さん専用・要認証）

## 開発コマンド

```bash
npm run dev      # 開発サーバー起動
npm run build    # 本番ビルド
npm run lint     # Lint実行
```
