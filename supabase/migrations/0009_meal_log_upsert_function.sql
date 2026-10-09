-- meal_logsのupsert(ON CONFLICT DO UPDATE)をSECURITY DEFINER関数経由にする
--
-- 背景: PostgreSQLの INSERT ... ON CONFLICT DO UPDATE は、競合先の既存行を
-- 判定するために対象行を参照できる必要がある。meal_logsはanonにSELECTを
-- 許可していない(他人の記録を覗き見できないようにする設計)ため、
-- アプリから直接 upsert すると「new row violates row-level security policy」
-- で弾かれる。
--
-- SECURITY DEFINER関数は定義者(テーブル所有者)権限で実行されRLSの対象外になるため、
-- anonにSELECT権限を与えずに「名前+日付が同じなら上書き」を安全に実現できる。
create or replace function public.upsert_meal_log(
  p_name text,
  p_log_date date,
  p_breakfast text,
  p_lunch text,
  p_dinner text,
  p_snack text,
  p_weight numeric,
  p_memo text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.meal_logs (name, log_date, breakfast, lunch, dinner, snack, weight, memo)
  values (p_name, p_log_date, p_breakfast, p_lunch, p_dinner, p_snack, p_weight, p_memo)
  on conflict (name, log_date)
  do update set
    breakfast = excluded.breakfast,
    lunch = excluded.lunch,
    dinner = excluded.dinner,
    snack = excluded.snack,
    weight = excluded.weight,
    memo = excluded.memo;
end;
$$;

-- 公開ページ(anon)からこの関数の実行のみを許可する(テーブルへの直接アクセスは許可しない)
grant execute on function public.upsert_meal_log(text, date, text, text, text, text, numeric, text) to anon;
