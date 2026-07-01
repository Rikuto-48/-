-- 診断結果テーブル
-- 1回の診断につき、回答内容・判定タイプ・診断日時を1レコードとして保存する。
create table if not exists public.diagnosis_results (
  id uuid primary key default gen_random_uuid(),
  answers jsonb not null,
  result_type text not null,
  created_at timestamptz not null default now()
);

alter table public.diagnosis_results enable row level security;

-- 診断ページ(認証なし)からの結果保存を許可する
create policy "Allow anonymous insert on diagnosis_results"
  on public.diagnosis_results
  for insert
  to anon
  with check (true);

-- 管理画面(認証あり・陸斗さん専用)からの一覧参照を許可する
create policy "Allow authenticated select on diagnosis_results"
  on public.diagnosis_results
  for select
  to authenticated
  using (true);
