# このリポジトリで作業する前に

イクマ管理ツール(React + TypeScript + Vite + Supabase、Vercelに自動デプロイ)の開発メモ。
同じ失敗を繰り返さないための教訓集。コードを書く前に目を通すこと。

## デプロイ・ブランチ運用

- `main` に push すると Vercel が自動で本番デプロイする。**動作確認が済んでいないコードを気軽に push しない**。
- 作業は専用ブランチ(例: `claude/ikuma-management-tool-426jvg`)で行い、確認が取れてから `main` にマージする。
- Supabase 側(SQL・Edge Function)はリポジトリの push だけでは反映されない。コードを直しても、実際の Supabase プロジェクト側で SQL 実行・Secrets 設定・Edge Function デプロイをやり直すまでは本番で効果が出ない。コードを直したら「Supabase側で何をやり直す必要があるか」を必ず明記する。

## Supabase RLS + upsert の罠(最重要)

`anon` ロールが対象テーブルに `SELECT` 権限を持たない設計(他人のデータを見せないため、意図的)のとき、クライアントから `.upsert()`(`INSERT ... ON CONFLICT DO UPDATE`)を直接呼ぶと **RLSポリシー違反で失敗する**。個々の INSERT/UPDATE ポリシーが `true` でも関係なく失敗する。原因は、競合行の可視性チェックに `SELECT` 権限が要るため。

**対処**: テーブルへの直接書き込みをクライアントに許可せず、`SECURITY DEFINER` の Postgres 関数を経由させる。関数にだけ `grant execute ... to anon` し、テーブル自体への直接権限は与えない。読み取りも、本人分だけに絞りたい場合は同じパターンで関数化する(例: `get_my_meal_logs(p_name)`)。
参考実装: `supabase/migrations/0009_meal_log_upsert_function.sql` の `upsert_meal_log`。

## SQLマイグレーションは必ず冪等に書く

Supabase の SQL Editor(Web UI)は実行中に不可解にクラッシュすることがあり、再実行時に「既に存在する」系のエラーで止まることがある。**初めから再実行前提で書く**:

- `create policy` に `IF NOT EXISTS` は無い → `drop policy if exists "..." on ...;` してから `create policy ...`
- `create or replace function` を使う(`create function` ではなく)
- `alter table ... add column if not exists ...`
- 関数のシグネチャ(引数)を変える場合は `drop function if exists ...(型, 型, ...)` してから再作成(Postgres は引数の型まで一致しないと上書きできない)

Studio の画面が原因不明のエラーで固まったら、ブラウザのシークレット/シークレットウィンドウで開き直すと直ることが多い。

## 匿名公開ページ(ログイン不要)の設計パターン

`/meal` のように、会員登録なしで誰でも使えるページは以下の構成:

- データの書き込みは `anon` ロールの RLS ポリシー(`to anon`)で許可する
- 他人のデータを見せたくない場合、テーブルへの直接 `SELECT` は許可せず、上記の `SECURITY DEFINER` 関数で絞る
- `/admin/*` 配下は Supabase Auth ログイン必須(`AuthContext.tsx` / `ProtectedRoute.tsx`)。コーチ(陸斗さん)だけが全員分を見られる

## 匿名呼び出しの Edge Function

ログイン不要のページから呼ぶ Edge Function は、デフォルトの JWT 検証が有効だと失敗する。

- CLI: `supabase functions deploy <name> --no-verify-jwt`
- ダッシュボード: Edge Functions → 該当関数 → Settings → 「Verify JWT with legacy secret」を **オフ**にして Save
- 外部APIキーは Edge Function 側のシークレット(`supabase secrets set KEY=value` またはダッシュボードの Secrets)にのみ保持し、クライアントに渡さない
- 参考実装: `supabase/functions/estimate-meal-nutrition/index.ts`

## 外部AIを使う機能は無料枠を優先する

陸斗さんの方針: 可能な限り課金が発生しない構成にする。食事記録のカロリー・PFC推定は Anthropic Claude API(有料)から Google Gemini API(無料枠)に切り替え済み。

- Gemini のモデルは定期的に廃止される(`gemini-2.5-flash` は2026年に新規ユーザー向け廃止)。モデル名をハードコードしている場合、動かなくなったら [Google AI Studio](https://aistudio.google.com/) の Model selection 一覧で「Paid」ラベルが付いていないモデルを確認し、差し替える
- APIキーは無料でも、クライアント側に露出させない設計は変えない(Edge Function 経由を維持)

## 写真アップロード

- `meal-photos` のような公開ストレージバケットを使い、`storage.objects` に `to anon` の INSERT ポリシーをバケット単位で絞る
- アップロード前にブラウザの canvas でリサイズ・圧縮してからアップロードする(通信量・保存容量の節約)
- `<input type="file">` に `capture="environment"` を付けるとカメラ起動のみになり、写真アルバムから選べなくなる。アルバム選択も許可したい場合は付けない
