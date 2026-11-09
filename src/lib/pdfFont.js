// Telugu support for jsPDF. The default PDF fonts have no Telugu glyphs, so a small Noto Sans Telugu subset
// (public/fonts) is embedded only when a PDF actually contains Telugu text.
// Note: jsPDF does not do OpenType shaping, so some conjuncts (for example ర vattu) show in their long form.
const TELUGU = /[\u0C00-\u0C7F]/
export const hasTelugu = (v) => TELUGU.test(String(v ?? ''))

let b64 = null
// resolves true when the font is registered on `doc`, false when it could not be loaded
export async function registerTeluguFont(doc) {
  try {
    if (!b64) {
      const res = await fetch(`${import.meta.env.BASE_URL}fonts/NotoSansTelugu-Subset.ttf`)
      if (!res.ok) return false
      const bytes = new Uint8Array(await res.arrayBuffer())
      let bin = ''
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
      b64 = btoa(bin)
    }
    doc.addFileToVFS('NotoTelugu.ttf', b64)
    doc.addFont('NotoTelugu.ttf', 'NotoTelugu', 'normal')
    doc.addFont('NotoTelugu.ttf', 'NotoTelugu', 'bold')
    return true
  } catch {
    return false
  }
}

// draw text, using the Telugu font only for strings that contain Telugu
export function put(doc, text, x, y, opts, style = 'normal') {
  doc.setFont(hasTelugu(text) && doc.getFontList().NotoTelugu ? 'NotoTelugu' : 'helvetica', style)
  doc.text(String(text), x, y, opts)
}

// autoTable hook: Telugu cells use the Telugu font
export const teluguCellHook = (data) => {
  if (data.cell?.text && hasTelugu(data.cell.text.join(' ')) && data.doc.getFontList().NotoTelugu) {
    data.cell.styles.font = 'NotoTelugu'
  }
}
