-- Instagram Graph APIとの自動連携用テーブル
-- sync-instagram Edge Function がサービスロールで書き込み、管理画面(認証あり)が読み取る想定。

-- アカウント全体の日次スナップショット(フォロワー数・リーチ・プロフィールアクセス数など)
create table if not exists public.instagram_account_metrics (
  date date primary key,
  followers_count integer,
  reach integer,
  profile_views integer,
  accounts_engaged integer,
  synced_at timestamptz not null default now()
);

alter table public.instagram_account_metrics enable row level security;

create policy "Allow authenticated select on instagram_account_metrics"
  on public.instagram_account_metrics
  for select
  to authenticated
  using (true);

-- 投稿(メディア)単位の実績。content_calendar の該当リールに手動で紐付けられるようにする。
create table if not exists public.instagram_media_insights (
  ig_media_id text primary key,
  media_type text,
  caption text,
  permalink text,
  posted_at timestamptz,
  impressions integer,
  reach integer,
  saved integer,
  likes integer,
  comments integer,
  shares integer,
  content_calendar_id uuid references public.content_calendar(id) on delete set null,
  synced_at timestamptz not null default now()
);

alter table public.instagram_media_insights enable row level security;

create policy "Allow authenticated select on instagram_media_insights"
  on public.instagram_media_insights
  for select
  to authenticated
  using (true);

-- 管理画面から「コンテンツカレンダーに反映」した紐付けを保存できるようにする
create policy "Allow authenticated update on instagram_media_insights"
  on public.instagram_media_insights
  for update
  to authenticated
  using (true)
  with check (true);
