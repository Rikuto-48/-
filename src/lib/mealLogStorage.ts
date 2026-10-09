const STORAGE_KEY = 'ikuma_meal_log_name'

// 初回入力した名前をlocalStorageに保存し、次回以降のフォームに自動入力する
export function getSavedMealLogName(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function saveMealLogName(name: string) {
  try {
    localStorage.setItem(STORAGE_KEY, name)
  } catch {
    // localStorageが使えない環境(プライベートブラウズ等)では何もしない
  }
}
