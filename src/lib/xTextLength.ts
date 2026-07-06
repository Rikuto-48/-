// X(旧Twitter)の投稿文字数カウント。
// Xは半角系の文字を1、全角(CJK等)を2の重みで数え、合計280が上限(=全角だけなら140文字)。
// URLは実際の長さに関わらず一律23としてカウントされる。

export const X_WEIGHT_LIMIT = 280

const URL_PATTERN = /https?:\/\/\S+/g
const URL_WEIGHT = 23

// Xが重み1として扱うコードポイント範囲(それ以外は重み2)
function charWeight(codePoint: number): number {
  const isLight =
    codePoint <= 0x10ff ||
    (codePoint >= 0x2000 && codePoint <= 0x200d) ||
    (codePoint >= 0x2010 && codePoint <= 0x201f) ||
    (codePoint >= 0x2032 && codePoint <= 0x2037)
  return isLight ? 1 : 2
}

export function xWeightedLength(text: string): number {
  let total = 0
  const withoutUrls = text.replace(URL_PATTERN, () => {
    total += URL_WEIGHT
    return ''
  })
  for (const char of withoutUrls) {
    total += charWeight(char.codePointAt(0) ?? 0)
  }
  return total
}
