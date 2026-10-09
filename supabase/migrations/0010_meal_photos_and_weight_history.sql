-- 食事写真のアップロード対応・体重推移の自己閲覧対応
--
-- 1) meal_logsに photo_url を追加
alter table public.meal_logs add column if not exists photo_url text;

-- 2) 写真を保存するStorageバケットを作成し、anonからのアップロードのみ許可する
--    (公開バケット: アップロード後に返る公開URLをそのまま photo_url として保存する運用。
--     パスはランダムなファイル名のみで、一覧取得や名前からの推測はできない)
insert into storage.buckets (id, name, public)
values ('meal-photos', 'meal-photos', true)
on conflict (id) do nothing;

create policy "Allow anonymous upload to meal-photos"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'meal-photos');

-- 3) upsert_meal_log を photo_url 対応版に置き換える
--    (引数構成が変わるため、旧バージョンの関数は明示的に削除してから作り直す)
drop function if exists public.upsert_meal_log(text, date, text, text, text, text, numeric, text);

create or replace function public.upsert_meal_log(
  p_name text,
  p_log_date date,
  p_breakfast text,
  p_lunch text,
  p_dinner text,
  p_snack text,
  p_weight numeric,
  p_memo text,
  p_photo_url text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.meal_logs (name, log_date, breakfast, lunch, dinner, snack, weight, memo, photo_url)
  values (p_name, p_log_date, p_breakfast, p_lunch, p_dinner, p_snack, p_weight, p_memo, p_photo_url)
  on conflict (name, log_date)
  do update set
    breakfast = excluded.breakfast,
    lunch = excluded.lunch,
    dinner = excluded.dinner,
    snack = excluded.snack,
    weight = excluded.weight,
    memo = excluded.memo,
    -- 写真を付けずに再送信した場合、既にある写真を消さないようにする
    photo_url = coalesce(excluded.photo_url, public.meal_logs.photo_url);
end;
$$;

grant execute on function public.upsert_meal_log(text, date, text, text, text, text, numeric, text, text) to anon;

-- 4) 本人が自分の体重推移だけを見られるようにする関数
--    (writeと同じく「名前」を本人確認の代わりに使う設計。他人の食事内容などは一切返さない)
create or replace function public.get_weight_history(p_name text)
returns table(log_date date, weight numeric)
language sql
security definer
set search_path = public
as $$
  select log_date, weight
  from public.meal_logs
  where name = p_name and weight is not null
  order by log_date asc;
$$;

grant execute on function public.get_weight_history(text) to anon;
