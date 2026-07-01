-- コンテンツカレンダーテーブル
-- 100本リール企画の投稿予定日・ステータスを管理する。
create table if not exists public.content_calendar (
  id uuid primary key default gen_random_uuid(),
  reel_number integer,
  title text not null,
  scheduled_date date,
  status text not null default '未着手',
  memo text,
  created_at timestamptz not null default now()
);

alter table public.content_calendar enable row level security;

-- 管理画面(認証あり・陸斗さん専用)のみ読み書き可能
create policy "Allow authenticated all on content_calendar"
  on public.content_calendar
  for all
  to authenticated
  using (true)
  with check (true);
