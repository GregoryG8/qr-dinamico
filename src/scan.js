// Reglas de escaneo puras (sin DOM) para poder probarlas con `npm test`.

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map(i => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

// Relación de contraste WCAG (1 a 21) entre dos colores #rrggbb.
export function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

export function contrastWarning(fg, bg) {
  if (luminance(fg) > luminance(bg)) {
    return 'El QR es más claro que el fondo: muchos lectores no leen QR invertidos. Usa QR oscuro sobre fondo claro.'
  }
  const ratio = contrastRatio(fg, bg)
  if (ratio < 4.5) return `Contraste bajo (${ratio.toFixed(1)}:1). Se recomienda al menos 4.5:1 para que escanee bien.`
  return ''
}
