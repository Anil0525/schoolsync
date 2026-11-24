import { isoOf } from './cal.js'

// Next birthday on or after `from` (a Date at midnight). 29 Feb falls back to 28 Feb in non-leap years.
export function nextBirthday(dobIso, from) {
  const [, m, d] = dobIso.split('-').map(Number)
  const make = (y) => {
    const dt = new Date(y, m - 1, d)
    if (m === 2 && d === 29 && dt.getMonth() !== 1) return new Date(y, 1, 28)
    return dt
  }
  let dt = make(from.getFullYear())
  if (dt < from) dt = make(from.getFullYear() + 1)
  return dt
}

export function birthdayList(students, days = 30) {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return students
    .filter((s) => s.dob)
    .map((s) => {
      const dt = nextBirthday(s.dob, from)
      return { ...s, date: isoOf(dt), inDays: Math.round((dt - from) / 86400000), age: dt.getFullYear() - Number(s.dob.slice(0, 4)) }
    })
    .filter((s) => s.inDays <= days)
    .sort((a, b) => a.inDays - b.inDays || a.full_name.localeCompare(b.full_name))
}

export function wishText(name, school, lang) {
  return lang === 'te'
    ? `${name}కు పుట్టినరోజు శుభాకాంక్షలు! 🎉 మీ భవిష్యత్తు ఆనందంగా, విజయవంతంగా ఉండాలని కోరుకుంటున్నాము. - ${school}`
    : `Happy Birthday, ${name}! 🎉 Wishing you a wonderful year ahead. - ${school}`
}

// Draws a 1080x1080 wish card and returns a PNG blob
export async function wishCardBlob({ name, classLabel, school, lang }) {
  try { await Promise.all([document.fonts.load('600 60px "Hind Guntur"'), document.fonts.load('700 60px "Source Serif 4"')]) } catch { /* fall back to system fonts */ }
  const W = 1080
  const c = document.createElement('canvas')
  c.width = W; c.height = W
  const g = c.getContext('2d')
  const grad = g.createLinearGradient(0, 0, W, W)
  grad.addColorStop(0, '#1f4d3f'); grad.addColorStop(1, '#163a30')
  g.fillStyle = grad; g.fillRect(0, 0, W, W)
  const dots = ['#f6f7f4', '#e8c468', '#c9372c', '#8fc7b0']
  for (let i = 0; i < 46; i++) {
    g.fillStyle = dots[i % dots.length]; g.globalAlpha = 0.5
    g.beginPath(); g.arc((i * 337) % W, (i * 211 + 60) % W, 6 + (i % 4) * 3, 0, Math.PI * 2); g.fill()
  }
  g.globalAlpha = 1
  g.fillStyle = '#f6f7f4'
  g.beginPath(); g.roundRect(90, 190, W - 180, W - 380, 36); g.fill()

  g.textAlign = 'center'
  const fit = (text, weight, family, size, max) => {
    let s = size
    do { g.font = `${weight} ${s}px ${family}`; s -= 2 } while (g.measureText(text).width > max && s > 24)
  }
  g.fillStyle = '#1f4d3f'
  fit(lang === 'te' ? 'పుట్టినరోజు శుభాకాంక్షలు!' : 'Happy Birthday!', 700, '"Source Serif 4", "Hind Guntur", serif', 92, W - 260)
  g.fillText(lang === 'te' ? 'పుట్టినరోజు శుభాకాంక్షలు!' : 'Happy Birthday!', W / 2, 400)
  g.fillStyle = '#1d2a26'
  fit(name, 600, '"Hind Guntur", sans-serif', 86, W - 260)
  g.fillText(name, W / 2, 560)
  g.fillStyle = '#5f6d66'
  g.font = '500 44px "Hind Guntur", sans-serif'
  if (classLabel) g.fillText(classLabel, W / 2, 640)
  g.font = '500 40px "Hind Guntur", sans-serif'
  g.fillText(lang === 'te' ? 'మీకు శుభం కలగాలి' : 'Wishing you a wonderful year', W / 2, 740)
  g.fillStyle = '#f6f7f4'
  fit(school, 600, '"Hind Guntur", sans-serif', 46, W - 200)
  g.fillText(school, W / 2, 930)
  return new Promise((res) => c.toBlob(res, 'image/png'))
}
