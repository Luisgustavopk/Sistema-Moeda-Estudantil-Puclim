/** A QR carries only the coupon identifier, never a destination URL. */
export function couponCodeFromQr(value: string): string | null {
  const code = value.trim().toUpperCase()
  if (code.length > 40) return null
  return /^[A-F0-9]{8}(?:-[A-F0-9]{4}){3}-[A-F0-9]{12}$/.test(code) ||
    /^PCL-[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(code)
    ? code
    : null
}

export async function qrDecoder() {
  return (await import('jsqr')).default
}

export async function couponCodeFromImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/'))
    throw new Error('Escolha uma imagem com o QR Code do cupom.')
  if (file.size > 10 * 1024 * 1024)
    throw new Error(
      'A imagem deve ter até 10 MB. Você também pode digitar o código.',
    )
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error(
      'Não foi possível abrir esta imagem. Tente PNG ou JPEG, ou digite o código.',
    )
  })
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context)
      throw new Error(
        'Não foi possível ler a imagem. Digite o código do cupom.',
      )
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
    const decode = await qrDecoder()
    const qr = decode(pixels.data, pixels.width, pixels.height, {
      inversionAttempts: 'attemptBoth',
    })
    if (!qr)
      throw new Error(
        'Nenhum QR Code encontrado. Tente uma imagem mais nítida ou digite o código.',
      )
    const code = couponCodeFromQr(qr.data)
    if (!code)
      throw new Error(
        'Este QR Code não contém um código de cupom Puclim. Digite o código apresentado pelo aluno.',
      )
    return code
  } finally {
    bitmap.close()
  }
}
