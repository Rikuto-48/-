-- 診断結果に流入元(source)を追加
-- X運用などで診断ページURLに付けた ?src= パラメータを保存し、媒体ごとの診断数を比較できるようにする。
-- 値の例: 'x' / 'instagram'。パラメータ無しでアクセスした場合は null。
alter table public.diagnosis_results
  add column if not exists source text;
