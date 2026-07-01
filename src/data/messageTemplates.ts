// 7日間チャレンジの進捗に応じたLINEメッセージのテンプレート(仮データ)
// LINE公式アカウント側での配信自動化は未実装で、ここでは「今日誰に何を送るべきか」の
// 下準備(文面の用意)までを行う。実際の送信は陸斗さんが手動でLINEから行う想定。

export type MessageSituation =
  | 'welcome'
  | 'reminder'
  | 'encouragement'
  | 'graduation'
  | 'reengagement'

export const MESSAGE_SITUATION_LABELS: Record<MessageSituation, string> = {
  welcome: '登録初日メッセージ',
  reminder: '進捗リマインド',
  encouragement: '励ましメッセージ(前日未達成)',
  graduation: '7日間達成おめでとうメッセージ',
  reengagement: '再エンゲージメッセージ(未達成のまま7日経過)',
}

export function buildMessage(
  situation: MessageSituation,
  name: string,
  dayNumber: number,
): string {
  switch (situation) {
    case 'welcome':
      return `${name}さん、LINE登録ありがとうございます！\n今日から7日間チャレンジスタートです。まずは1日目、無理のない範囲でやってみましょう💪`
    case 'reminder':
      return `${name}さん、7日間チャレンジ${dayNumber}日目です！\n昨日も達成できていましたね、この調子でいきましょう🔥`
    case 'encouragement':
      return `${name}さん、7日間チャレンジ${dayNumber}日目です。\n昨日はできなかった日もあると思いますが、大丈夫です。今日からまた1日ずつ積み重ねていきましょう！`
    case 'graduation':
      return `${name}さん、7日間チャレンジ達成おめでとうございます🎉\nこの1週間の頑張りを、今後の本格的なサポートにも活かしていきませんか？よければ一度お電話でお話しさせてください。`
    case 'reengagement':
      return `${name}さん、その後の調子はいかがですか？\n7日間チャレンジが途中になっていましたが、いつでも再開できます。まずは気軽にメッセージくださいね。`
    default:
      return ''
  }
}
