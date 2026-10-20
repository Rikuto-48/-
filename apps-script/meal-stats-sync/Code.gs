/**
 * イクマ食事管理データ集計 - Googleスプレッドシート同期スクリプト
 *
 * これはビルド対象外の参考ソースです。実際に使うときは、対象のGoogleスプレッドシートで
 * 「拡張機能 > Apps Script」を開き、このファイルの内容をまるごと貼り付けてください。
 * セットアップ手順の詳細はリポジトリのREADME.md「食事管理データの集計表(Googleスプレッドシート)
 * について」を参照してください。
 *
 * 事前準備(このリポジトリの外で行う):
 *   1. Supabaseで supabase/migrations/0014_meal_stats_for_sheets_sync.sql を実行する
 *   2. このスクリプトを対象シートに貼り付け、下の SUPABASE_PROJECT_URL を自分のSupabaseプロジェクトURLに書き換える
 *   3. シートを開き直し、メニュー「イクマ集計」→「APIキーを設定」でSupabaseのservice_roleキーを登録する
 *      (service_roleキーはSupabaseダッシュボードの Project Settings > API > service_role から取得。
 *       このキーはRLSを完全にバイパスするため、絶対にシートのセルやコードに直接書かないこと)
 *   4. 「イクマ集計」→「今すぐ更新」で動作確認する
 *   5. 「イクマ集計」→「毎日自動更新を設定」で日次の自動更新を有効にする
 */

// Supabaseプロジェクトの公開URL(機密情報ではない。VITE_SUPABASE_URLと同じ値)
var SUPABASE_PROJECT_URL = 'https://your-project-ref.supabase.co';

var SERVICE_ROLE_KEY_PROPERTY = 'SUPABASE_SERVICE_ROLE_KEY';

var SHEET_CONTINUITY = '記録状況';
var SHEET_WEIGHT = '体重推移';
var SHEET_NUTRITION = 'カロリーPFC平均';
var SHEET_SYNC_LOG = '同期ログ';

/**
 * スプレッドシートを開いたときにメニューを追加する。
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('イクマ集計')
    .addItem('今すぐ更新', 'syncMealStatsFromMenu')
    .addItem('毎日自動更新を設定', 'createDailyTrigger')
    .addSeparator()
    .addItem('APIキーを設定', 'promptForServiceRoleKey')
    .addToUi();
}

/**
 * Supabaseのservice_roleキーをダイアログで入力させ、Script Propertiesに保存する。
 * キーはコードにもシートのセルにも書き込まれない。
 */
function promptForServiceRoleKey() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt(
    'Supabase service_role キーを設定',
    'Supabaseダッシュボード > Project Settings > API の "service_role" キーを貼り付けてください。',
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  var key = response.getResponseText().trim();
  if (!key) {
    ui.alert('キーが空のため設定をキャンセルしました。');
    return;
  }

  PropertiesService.getScriptProperties().setProperty(SERVICE_ROLE_KEY_PROPERTY, key);
  ui.alert('APIキーを保存しました。');
}

/**
 * 毎日午前6時(シートのタイムゾーン基準)に自動更新するトリガーを設定する。
 * 既存の同名トリガーがあれば削除してから作り直すため、複数回実行しても重複しない。
 */
function createDailyTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'syncMealStatsFromTrigger') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger('syncMealStatsFromTrigger').timeBased().everyDays(1).atHour(6).create();

  SpreadsheetApp.getUi().alert('毎日午前6時頃に自動更新するよう設定しました。');
}

/**
 * メニュー「今すぐ更新」から呼ばれる。結果をダイアログで表示する。
 */
function syncMealStatsFromMenu() {
  var ui = SpreadsheetApp.getUi();
  try {
    syncMealStats_();
    ui.alert('更新が完了しました。');
  } catch (error) {
    ui.alert('更新に失敗しました: ' + error.message);
  }
}

/**
 * 時間主導型トリガーから呼ばれる。対話UIが無いコンテキストのため getUi() は呼ばない
 * (トリガー実行時に getUi() を呼ぶと例外になり、エラーの原因が分かりにくくなる)。
 * 結果は同期ログシートにのみ記録する。
 */
function syncMealStatsFromTrigger() {
  try {
    syncMealStats_();
  } catch (error) {
    // syncMealStats_ 内で同期ログへの記録は完了しているため、ここでは何もしない。
  }
}

/**
 * 3つのSupabase RPCを呼び出し、結果をシートに書き込む共通ロジック。
 * 成功・失敗を問わず、最後に同期ログへ1行追記する。
 */
function syncMealStats_() {
  var key = PropertiesService.getScriptProperties().getProperty(SERVICE_ROLE_KEY_PROPERTY);
  if (!key) {
    appendSyncLog_('エラー', 'APIキーが未設定です。「APIキーを設定」から設定してください。');
    throw new Error('APIキーが未設定です。「APIキーを設定」から設定してください。');
  }

  try {
    var continuity = callRpc_('get_meal_log_continuity_stats', key);
    writeSheetTable_(
      SHEET_CONTINUITY,
      ['名前', '総記録日数', '最終記録日', '直近7日の記録日数', '直近30日の記録日数', '継続率(7日,%)', '継続率(30日,%)'],
      continuity.map(function (row) {
        return [
          row.name,
          row.total_log_days,
          row.last_log_date,
          row.log_days_last_7d,
          row.log_days_last_30d,
          row.continuity_rate_7d,
          row.continuity_rate_30d,
        ];
      })
    );

    var weights = callRpc_('get_weight_history_all', key);
    writeSheetTable_(
      SHEET_WEIGHT,
      ['名前', '日付', '体重(kg)'],
      weights.map(function (row) {
        return [row.name, row.log_date, row.weight];
      })
    );

    var nutrition = callRpc_('get_nutrition_averages', key);
    writeSheetTable_(
      SHEET_NUTRITION,
      ['名前', '平均カロリー(kcal)', '平均タンパク質(g)', '平均脂質(g)', '平均炭水化物(g)', '推定件数'],
      nutrition.map(function (row) {
        return [row.name, row.avg_calories, row.avg_protein, row.avg_fat, row.avg_carbs, row.estimated_sample_count];
      })
    );

    appendSyncLog_('成功', '記録状況' + continuity.length + '件 / 体重推移' + weights.length + '件 / 栄養平均' + nutrition.length + '件を更新');
  } catch (error) {
    appendSyncLog_('エラー', error.message);
    throw error;
  }
}

/**
 * Supabase PostgRESTのRPCエンドポイントをPOSTで呼び出す。
 */
function callRpc_(functionName, serviceRoleKey) {
  var url = SUPABASE_PROJECT_URL + '/rest/v1/rpc/' + functionName;
  var response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      apikey: serviceRoleKey,
      Authorization: 'Bearer ' + serviceRoleKey,
    },
    payload: '{}',
    muteHttpExceptions: true,
  });

  var status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error(functionName + ' の呼び出しに失敗しました(status ' + status + '): ' + response.getContentText());
  }

  return JSON.parse(response.getContentText());
}

/**
 * 指定したシート名の内容をクリアし、ヘッダー行+データ行を書き込む。
 * シートが存在しない場合は新規作成する。
 */
function writeSheetTable_(sheetName, headerRow, rows) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  sheet.clear();

  var values = [headerRow].concat(rows);
  sheet.getRange(1, 1, values.length, headerRow.length).setValues(values);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headerRow.length);
}

/**
 * 同期ログシートに実行結果を1行追記する。シートが無ければヘッダー付きで新規作成する。
 */
function appendSyncLog_(status, detail) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_SYNC_LOG);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_SYNC_LOG);
    sheet.appendRow(['実行日時', '結果', '詳細']);
    sheet.setFrozenRows(1);
  }
  sheet.appendRow([new Date(), status, detail]);
}
