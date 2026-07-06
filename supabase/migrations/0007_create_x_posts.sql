-- X(旧Twitter)予約投稿テーブル
-- 管理画面で作成した投稿を予約日時に自動投稿する。実際の投稿はEdge Function `post-to-x` が行う。
-- status: draft(下書き) / scheduled(予約済み) / posted(投稿済み) / failed(失敗)
create table if not exists public.x_posts (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  scheduled_at timestamptz,
  status text not null default 'draft',
  tweet_id text,
  error_message text,
  posted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.x_posts enable row level security;

-- 管理画面(認証あり・陸斗さん専用)のみ読み書き可能
-- Edge Functionはservice roleで動くためRLSの影響を受けない
create policy "Allow authenticated all on x_posts"
  on public.x_posts
  for all
  to authenticated
  using (true)
  with check (true);
