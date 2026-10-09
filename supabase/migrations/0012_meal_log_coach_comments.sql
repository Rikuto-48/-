-- 陸斗さん⇄本人のやり取り機能(コーチコメント・本人からの返信)
--
-- 1) コメント欄・返信欄を追加
alter table public.meal_logs add column if not exists coach_comment text;
alter table public.meal_logs add column if not exists client_reply text;

-- 2) 管理画面(認証あり)からコメントを書き込めるよう、authenticatedにUPDATEを許可する
--    (これまでSELECTのみだった)
create policy "Allow authenticated update on meal_logs"
  on public.meal_logs
  for update
  to authenticated
  using (true)
  with check (true);

-- 3) 本人が自分の全記録(食事内容・写真・コメント・返信)を取得する関数
--    (書き込みと同じく「名前」を本人確認の代わりに使う設計)
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
  client_reply text
)
language sql
security definer
set search_path = public
as $$
  select log_date, breakfast, lunch, dinner, snack, weight, memo,
         breakfast_photo_url, lunch_photo_url, dinner_photo_url, snack_photo_url,
         coach_comment, client_reply
  from public.meal_logs
  where name = p_name
  order by log_date desc;
$$;

grant execute on function public.get_my_meal_logs(text) to anon;

-- 4) 本人が特定の日の記録に返信を残せる関数
create or replace function public.set_client_reply(p_name text, p_log_date date, p_reply text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.meal_logs
  set client_reply = p_reply
  where name = p_name and log_date = p_log_date;
end;
$$;

grant execute on function public.set_client_reply(text, date, text) to anon;
