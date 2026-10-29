export type Tone = 'success' | 'warning' | 'error'

export type Options = { ctxWarn: number; ctxCrit: number; folderIcon: string; modelIcon: string; textColor: string
  showFiveHourReset: boolean; showWeeklyReset: boolean }

export const optionsFrom = (raw: Record<string, unknown>): Options => ({
  ctxWarn: typeof raw.ctxWarn === 'number' ? raw.ctxWarn : 20,
  ctxCrit: typeof raw.ctxCrit === 'number' ? raw.ctxCrit : 35,
  folderIcon: typeof raw.folderIcon === 'string' ? raw.folderIcon : '📁',
  modelIcon: typeof raw.modelIcon === 'string' ? raw.modelIcon : '⚙️',
  showFiveHourReset: raw.showFiveHourReset !== false,
  showWeeklyReset: raw.showWeeklyReset !== false,
  textColor: typeof raw.textColor === 'string' && raw.textColor ? raw.textColor : '#8aa4c8',
})

// "claude-opus-5-5[1m]" -> "Opus 5.5"; a settings alias like "opus" -> "Opus".
export const modelName = (id: string) => {
  const [family, ...version] = id
    .replace(/\[.*\]$/, '')
    .replace(/^claude-/, '')
    .replace(/-\d{8}$/, '')
    .split('-')
  const name = family.charAt(0).toUpperCase() + family.slice(1)
  return version.length ? `${name} ${version.join('.')}` : name
}

export const contextTone = (percent: number, o: Options): Tone =>
  percent > o.ctxCrit ? 'error' : percent > o.ctxWarn ? 'warning' : 'success'

export const usageTone = (percent: number): Tone =>
  percent >= 80 ? 'error' : percent >= 50 ? 'warning' : 'success'

export const kilo = (tokens: number) => `${Math.round(tokens / 1000)}k`

// 5 braille cells filling in quarters: 20 steps. Returns the filled run and the empty track.
export const meter = (percent: number, cells = 5) => {
  const glyph = ['⣀', '⣤', '⣶', '⣿']
  const quarters = Math.min(cells * 4, Math.max(0, Math.round((percent * cells * 4) / 100)))
  let filled = ''
  for (let i = 0; i < cells; i++) {
    const level = Math.min(4, quarters - i * 4)
    if (level > 0) filled += glyph[level - 1]
  }
  return { filled, track: '⡀'.repeat(cells - filled.length) }
}

export const resetIn = (resetsAt: number, now: number) => {
  if (resetsAt <= now) return 'now'
  const mins = Math.ceil((resetsAt - now) / 60_000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h > 0 && m > 0) return `${h} hr ${m} min`
  return h > 0 ? `${h} hr` : `${m} min`
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const pad = (n: number) => String(n).padStart(2, '0')

// The module's clock is UTC, so local time is shifted by the offset `date +%z` reported.
export const resetAt = (resetsAt: number, offsetMin: number) => {
  const d = new Date(resetsAt + offsetMin * 60_000)
  return `${DAYS[d.getUTCDay()]} ${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

export const parseOffset = (text: string) => {
  const match = /([+-])(\d{2})(\d{2})/.exec(text)
  if (!match) return undefined
  const minutes = Number(match[2]) * 60 + Number(match[3])
  return match[1] === '-' ? -minutes : minutes
}

export const basename = (path: string) => path.replace(/\/+$/, '').split('/').pop() ?? path
