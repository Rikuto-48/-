-- 写真を「1日1枚」から「食事ごとに1枚(朝食・昼食・夕食・間食で最大4枚)」に変更する
--
-- 今回のバグ調査中は photo_url への保存自体が失敗していた(アップロード失敗)ため、
-- 実データは入っていない想定で、安全にカラムを置き換える。
alter table public.meal_logs drop column if exists photo_url;

alter table public.meal_logs add column if not exists breakfast_photo_url text;
alter table public.meal_logs add column if not exists lunch_photo_url text;
alter table public.meal_logs add column if not exists dinner_photo_url text;
alter table public.meal_logs add column if not exists snack_photo_url text;

-- upsert_meal_log を4枚の写真URLを受け取れる形に置き換える
drop function if exists public.upsert_meal_log(text, date, text, text, text, text, numeric, text, text);

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
  p_snack_photo_url text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.meal_logs (
    name, log_date, breakfast, lunch, dinner, snack, weight, memo,
    breakfast_photo_url, lunch_photo_url, dinner_photo_url, snack_photo_url
  )
  values (
    p_name, p_log_date, p_breakfast, p_lunch, p_dinner, p_snack, p_weight, p_memo,
    p_breakfast_photo_url, p_lunch_photo_url, p_dinner_photo_url, p_snack_photo_url
  )
  on conflict (name, log_date)
  do update set
    breakfast = excluded.breakfast,
    lunch = excluded.lunch,
    dinner = excluded.dinner,
    snack = excluded.snack,
    weight = excluded.weight,
    memo = excluded.memo,
    -- 写真を付けずに再送信した場合、既にある写真を消さないようにする(食事ごとに個別判定)
    breakfast_photo_url = coalesce(excluded.breakfast_photo_url, public.meal_logs.breakfast_photo_url),
    lunch_photo_url = coalesce(excluded.lunch_photo_url, public.meal_logs.lunch_photo_url),
    dinner_photo_url = coalesce(excluded.dinner_photo_url, public.meal_logs.dinner_photo_url),
    snack_photo_url = coalesce(excluded.snack_photo_url, public.meal_logs.snack_photo_url);
end;
$$;

grant execute on function public.upsert_meal_log(
  text, date, text, text, text, text, numeric, text, text, text, text, text
) to anon;
