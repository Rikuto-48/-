-- 食事記録のカロリー・PFC(タンパク質・脂質・炭水化物)をAIで推定して保存する
--
-- 食事はこれまで通り自由記述のテキストのまま。保存時にEdge Function
-- (estimate-meal-nutrition)がその日の食事内容からおおよその数値を推定し、
-- アプリがその結果をここに保存する。あくまで目安であり、精度を保証するもの
-- ではない点に注意(表示側でも注記する)。
alter table public.meal_logs add column if not exists estimated_calories numeric;
alter table public.meal_logs add column if not exists estimated_protein numeric;
alter table public.meal_logs add column if not exists estimated_fat numeric;
alter table public.meal_logs add column if not exists estimated_carbs numeric;

-- upsert_meal_log を推定値も受け取れる形に置き換える
drop function if exists public.upsert_meal_log(
  text, date, text, text, text, text, numeric, text, text, text, text, text
);

create or replace function public.upsert_meal_log(
  p_name text,
  p_log_date date,
  p_breakfast text,
  p_lunch text,
  p_dinner text,
  p_snack text,
  p_weight numeric,
  p_memo text,
  p_breakfast_photo_url text default null,
  p_lunch_photo_url text default null,
  p_dinner_photo_url text default null,
  p_snack_photo_url text default null,
  p_estimated_calories numeric default null,
  p_estimated_protein numeric default null,
  p_estimated_fat numeric default null,
  p_estimated_carbs numeric default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.meal_logs (
    name, log_date, breakfast, lunch, dinner, snack, weight, memo,
    breakfast_photo_url, lunch_photo_url, dinner_photo_url, snack_photo_url,
    estimated_calories, estimated_protein, estimated_fat, estimated_carbs
  )
  values (
    p_name, p_log_date, p_breakfast, p_lunch, p_dinner, p_snack, p_weight, p_memo,
    p_breakfast_photo_url, p_lunch_photo_url, p_dinner_photo_url, p_snack_photo_url,
    p_estimated_calories, p_estimated_protein, p_estimated_fat, p_estimated_carbs
  )
  on conflict (name, log_date)
  do update set
    breakfast = excluded.breakfast,
    lunch = excluded.lunch,
    dinner = excluded.dinner,
    snack = excluded.snack,
    weight = excluded.weight,
    memo = excluded.memo,
    breakfast_photo_url = coalesce(excluded.breakfast_photo_url, public.meal_logs.breakfast_photo_url),
    lunch_photo_url = coalesce(excluded.lunch_photo_url, public.meal_logs.lunch_photo_url),
    dinner_photo_url = coalesce(excluded.dinner_photo_url, public.meal_logs.dinner_photo_url),
    snack_photo_url = coalesce(excluded.snack_photo_url, public.meal_logs.snack_photo_url),
    -- 推定に失敗した場合は上書きせず、過去の推定値を残す
    estimated_calories = coalesce(excluded.estimated_calories, public.meal_logs.estimated_calories),
    estimated_protein = coalesce(excluded.estimated_protein, public.meal_logs.estimated_protein),
    estimated_fat = coalesce(excluded.estimated_fat, public.meal_logs.estimated_fat),
    estimated_carbs = coalesce(excluded.estimated_carbs, public.meal_logs.estimated_carbs);
end;
$$;

grant execute on function public.upsert_meal_log(
  text, date, text, text, text, text, numeric, text, text, text, text, text,
  numeric, numeric, numeric, numeric
) to anon;

-- get_my_meal_logs / get_weight_history も推定値を返せるよう更新
drop function if exists public.get_my_meal_logs(text);

create or replace function public.get_my_meal_logs(p_name text)
returns table(
  log_date date,
  breakfast text,
  lunch text,
  dinner text,
  snack text,
  weight numeric,
  memo text,
  breakfast_photo_url text,
  lunch_photo_url text,
  dinner_photo_url text,
  snack_photo_url text,
  coach_comment text,
  client_reply text,
  estimated_calories numeric,
  estimated_protein numeric,
  estimated_fat numeric,
  estimated_carbs numeric
)
language sql
security definer
set search_path = public
as $$
  select log_date, breakfast, lunch, dinner, snack, weight, memo,
         breakfast_photo_url, lunch_photo_url, dinner_photo_url, snack_photo_url,
         coach_comment, client_reply,
         estimated_calories, estimated_protein, estimated_fat, estimated_carbs
  from public.meal_logs
  where name = p_name
  order by log_date desc;
$$;

grant execute on function public.get_my_meal_logs(text) to anon;
