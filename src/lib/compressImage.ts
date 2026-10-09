// 画像をアップロード前にブラウザ側で圧縮する(幅を上限まで縮小 + JPEGで再エンコード)
export async function compressImage(
  file: File,
  maxWidth = 900,
  quality = 0.7,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxWidth / bitmap.width)
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('画像を処理できませんでした')
  }
  ctx.drawImage(bitmap, 0, 0, width, height)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('画像の圧縮に失敗しました'))
        }
      },
      'image/jpeg',
      quality,
    )
  })
}
