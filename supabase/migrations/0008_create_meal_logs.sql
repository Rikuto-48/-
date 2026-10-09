-- 食事管理ログテーブル
-- 診断結果ページと同じ考え方: ログイン不要で誰でも自分の記録を書き込め(anon)、
-- 陸斗さん(認証ユーザー)が全員の記録を閲覧できる(authenticated)。
-- 同じ人・同じ日の記録は1件に保つため、name + log_date の組にユニーク制約を付け、
-- アプリ側はupsert(同じ組み合わせなら更新)で書き込む。
create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  log_date date not null,
  breakfast text,
  lunch text,
  dinner text,
  snack text,
  weight numeric,
  memo text,
  created_at timestamptz not null default now(),
  unique (name, log_date)
);

alter table public.meal_logs enable row level security;

-- 公開ページ(認証なし)からの新規記録を許可する
create policy "Allow anonymous insert on meal_logs"
  on public.meal_logs
  for insert
  to anon
  with check (true);

-- 公開ページ(認証なし)からの上書き更新(同じ名前・同じ日付)を許可する
create policy "Allow anonymous update on meal_logs"
  on public.meal_logs
  for update
  to anon
  using (true)
  with check (true);

-- 管理画面(認証あり・陸斗さん専用)からの一覧参照を許可する
create policy "Allow authenticated select on meal_logs"
  on public.meal_logs
  for select
  to authenticated
  using (true);
