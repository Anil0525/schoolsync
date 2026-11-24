const pad = (n) => String(n).padStart(2, '0')
export const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Monday-first month grid: array of weeks, each week 7 cells (null = outside the month)
export function monthWeeks(year, month) {
  const first = new Date(year, month, 1)
  const days = new Date(year, month + 1, 0).getDate()
  const lead = (first.getDay() + 6) % 7
  const cells = Array(lead).fill(null)
  for (let d = 1; d <= days; d++) cells.push(isoOf(new Date(year, month, d)))
  while (cells.length % 7) cells.push(null)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export const eventsOn = (events, iso) => events.filter((e) => e.start_date <= iso && e.end_date >= iso)

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
