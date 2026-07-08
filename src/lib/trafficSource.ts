// 流入元(?src=x など)の記録。
// X運用戦略に基づき、プロフィールリンク等に付けた ?src= パラメータを初回アクセス時に
// sessionStorageへ保持し、診断結果の保存時に添付する。LPから診断ページへ遷移しても失われない。
const STORAGE_KEY = 'ikuma_traffic_source'
const MAX_LENGTH = 50

export function captureTrafficSource(): void {
  try {
    const src = new URLSearchParams(window.location.search).get('src')
    if (src) {
      sessionStorage.setItem(STORAGE_KEY, src.slice(0, MAX_LENGTH))
    }
  } catch {
    // sessionStorageが使えない環境(プライベートモード等)でも診断は動作させる
  }
}

export function getTrafficSource(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}
