export function getMesureLabel(type?: string): string {
  switch (type) {
    case 'taille': return 'Taille'
    case 'dimensions': return 'Dimensions'
    case 'pointures': return 'Pointure'
    case 'diametre': return 'Diamètre'
    default: return 'Taille'
  }
}

export function inferTypeMesure(size: string): string {
  if (!size) return 'taille'
  const s = size.trim()
  if (/^\d+$/.test(s)) return 'pointures'
  if (/[x×]/.test(s)) return 'dimensions'
  if (/cm/i.test(s)) return 'diametre'
  return 'taille'
}

export function getMesureLabelSafe(type: string | undefined | null, size: string | undefined | null): string {
  if (type) return getMesureLabel(type)
  if (size) return getMesureLabel(inferTypeMesure(size))
  return 'Taille'
}

export function formatMesureValue(value: string | number | undefined, type?: string): string {
  if (!value && value !== 0) return ''
  const s = String(value)
  if (type === 'diametre') {
    const raw = s.replace('cm', '').replace(' ', '').trim()
    return raw ? `${raw} cm` : s
  }
  return s
}
