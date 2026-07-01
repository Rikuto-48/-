-- 見込み客管理テーブル
-- LINE登録済みの見込み客を陸斗さんが手動で登録・管理する想定(診断ページとの自動連携は無し)。
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  diagnosis_type text,
  line_registered_at date,
  status text not null default '未登録',
  challenge_progress jsonb not null default '[false,false,false,false,false,false,false]'::jsonb,
  memo text,
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;

-- 管理画面(認証あり・陸斗さん専用)のみ読み書き可能
create policy "Allow authenticated all on leads"
  on public.leads
  for all
  to authenticated
  using (true)
  with check (true);
