-- 食事管理データ(meal_logs)をGoogleスプレッドシートへ同期するための集計関数。
--
-- Googleスプレッドシートに紐づくApps Script(apps-script/meal-stats-sync/Code.gs)が、
-- Supabaseのservice_roleキーを使ってPostgREST経由(/rest/v1/rpc/<関数名>)でこれらの関数を
-- 呼び出し、結果をシートに書き込む。陸斗さんが別サイトを見に行かなくても、スプレッドシート
-- だけで「記録状況(継続率)」「体重推移」「カロリー・PFC平均」を確認できるようにする。
--
-- 【重要・意図的にanon/authenticatedへgrantしない】
-- 既存のanon向け関数(get_my_meal_logs等)は必ずp_nameで1人分に絞っているからこそ、
-- anonキー(クライアントに公開されている)から呼んでも安全。しかしここで追加する3関数は
-- 全員分のデータを一度に返すため、anon/authenticatedにexecute権限を与えると、公開anon
-- キーだけで全員の体重・カロリー推定値が読めてしまう。そのため、この3関数には
-- grant executeを一切行わない。Apps Script側はservice_roleキーで呼び出す
-- (Supabaseのデフォルトでservice_roleはpublicスキーマの関数を呼べるため、明示的な
-- grantは不要。post-to-x/sync-instagramがEdge Function内でservice_roleクライアントを
-- 使うのと同じ考え方)。他の関数に倣って安易にgrant execute to anon/authenticatedを
-- 足さないこと。

-- 1. 記録状況(継続率): 名前ごとの記録日数・直近7日/30日の記録日数・継続率
create or replace function public.get_meal_log_continuity_stats()
returns table(
  name text,
  total_log_days bigint,
  last_log_date date,
  log_days_last_7d bigint,
  log_days_last_30d bigint,
  continuity_rate_7d numeric,
  continuity_rate_30d numeric
)
language sql
security definer
set search_path = public
as $$
  select
    name,
    count(distinct log_date) as total_log_days,
    max(log_date) as last_log_date,
    count(distinct log_date) filter (where log_date >= current_date - interval '6 days') as log_days_last_7d,
    count(distinct log_date) filter (where log_date >= current_date - interval '29 days') as log_days_last_30d,
    round(
      count(distinct log_date) filter (where log_date >= current_date - interval '6 days')::numeric / 7 * 100,
      1
    ) as continuity_rate_7d,
    round(
      count(distinct log_date) filter (where log_date >= current_date - interval '29 days')::numeric / 30 * 100,
      1
    ) as continuity_rate_30d
  from public.meal_logs
  group by name
  order by last_log_date desc;
$$;

revoke execute on function public.get_meal_log_continuity_stats() from public;

-- 2. 体重推移(全員分): 名前・日付・体重(本人専用のget_weight_history(p_name)の全員版)
create or replace function public.get_weight_history_all()
returns table(
  name text,
  log_date date,
  weight numeric
)
language sql
security definer
set search_path = public
as $$
  select name, log_date, weight
  from public.meal_logs
  where weight is not null
  order by name, log_date asc;
$$;

revoke execute on function public.get_weight_history_all() from public;

-- 3. カロリー・PFC平均: 名前ごとのAI推定値の平均(推定値が一度もない人は除外)
create or replace function public.get_nutrition_averages()
returns table(
  name text,
  avg_calories numeric,
  avg_protein numeric,
  avg_fat numeric,
  avg_carbs numeric,
  estimated_sample_count bigint
)
language sql
security definer
set search_path = public
as $$
  select
    name,
    round(avg(estimated_calories)::numeric, 1) as avg_calories,
    round(avg(estimated_protein)::numeric, 1) as avg_protein,
    round(avg(estimated_fat)::numeric, 1) as avg_fat,
    round(avg(estimated_carbs)::numeric, 1) as avg_carbs,
    count(estimated_calories) as estimated_sample_count
  from public.meal_logs
  group by name
  having count(estimated_calories) > 0
  order by name;
$$;

revoke execute on function public.get_nutrition_averages() from public;
