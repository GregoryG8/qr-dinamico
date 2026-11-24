import QRCodeStyling from 'qr-code-styling'

const M = 10 // px por módulo dentro del SVG: medidas exactas, sin redondeos
const QZ = 4 // quiet zone en módulos (estándar ISO 18004)
const CORNERS = { square: ['square', 'square'], rounded: ['extra-rounded', 'rounded'], dot: ['dot', 'dot'] }

// Devuelve el SVG final (texto) de un diseño; es lo mismo que se ve, se guarda y se descarga.
export async function buildSvg(d) {
  const qrOptions = { errorCorrectionLevel: d.logo ? 'H' : 'Q' }
  const qr = new QRCodeStyling({ type: 'svg', data: d.url, qrOptions })
  const n = qr._qr.getModuleCount() // shortcut: API privada de qr-code-styling, versión fijada 1.9.2; revisar si se actualiza la librería
  const side = (n + 2 * QZ) * M
  const [cornerSquare, cornerDot] = CORNERS[d.corners]
  qr.update({
    width: side,
    height: side,
    margin: QZ * M,
    image: d.logo || undefined,
    dotsOptions: { type: d.dots, color: d.fg },
    cornersSquareOptions: { type: cornerSquare, color: d.fg },
    cornersDotOptions: { type: cornerDot, color: d.fg },
    backgroundOptions: { color: d.bg },
    // Con H (30 %) el logo tapa como máximo 0.4 × 30 % = 12 % de los módulos (< 25 %).
    imageOptions: { imageSize: 0.4, margin: M / 2, hideBackgroundDots: true },
  })
  return (await (await qr.getRawData('svg')).text()).replace(/^<\?xml[^>]*>\s*/, '')
}

// Rasteriza el SVG con módulos de píxeles enteros y al menos 2000 px de lado.
export async function svgToPng(svg) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const cells = img.naturalWidth / M
    const size = cells * Math.ceil(2000 / cells)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    canvas.getContext('2d').drawImage(img, 0, 0, size, size)
    return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
  } finally {
    URL.revokeObjectURL(url)
  }
}
