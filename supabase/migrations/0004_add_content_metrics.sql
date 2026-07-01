-- コンテンツカレンダーの拡張
-- 1) コンテンツピラー(企画の型)を分類できるようにする
-- 2) 投稿後の実績数値(インプレッション・保存数・プロフィールアクセス・DM開始数)を記録できるようにする
-- これにより「どの型の投稿がDM/成約に効いているか」をデータで比較できるようにする。
alter table public.content_calendar
  add column if not exists content_pillar text,
  add column if not exists impressions integer,
  add column if not exists saves integer,
  add column if not exists profile_visits integer,
  add column if not exists dm_count integer;
