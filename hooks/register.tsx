import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Glance } from '../types'
import {
  basename,
  contextTone,
  kilo,
  meter,
  modelName,
  optionsFrom,
  parseOffset,
  resetAt,
  resetIn,
  usageTone,
} from './glance'

const view = atom({ plugin: 'glance', key: 'view' } as const, null as Glance | null)

const LIMITS: Record<string, string> = { five_hour: '5h', seven_day: '7d' }

let offsetMin = -new Date().getTimezoneOffset()
let now = Date.now()

async function measure($: EngineInterface, patch: Partial<Glance> = {}) {
  const { context, rateLimits } = await $.session.usage()
  now = await $.clock.now()
  await update($, view, current => ({
    folder: '',
    ...current,
    ...patch,
    context,
    limits: rateLimits.filter(limit => limit.kind in LIMITS),
  }))
}

export const register: Register = (on, raw) => {
  const options = optionsFrom(raw)

  on('session.start', async ($, e, next) => {
    try {
      offsetMin = parseOffset((await $.process.run(['date', '+%z'])).stdout) ?? offsetMin
    } catch {}
    // Until the first request names them, show what settings configure.
    const settings = await $.settings.read()
    const model = typeof settings.model === 'string' ? modelName(settings.model) : undefined
    const effort = typeof settings.effortLevel === 'string' ? settings.effortLevel : undefined
    await measure($, { folder: basename(e.cwd), model, effort })
    $.clock.every(60_000, () => measure($))

    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    if (!e.agentId) {
      const effort = typeof e.effort === 'string' ? e.effort : undefined
      await update($, view, current => current && { ...current, model: modelName(e.model), effort })
    }

    return yield* next(e)
  })

  on('session.measure', async ($, e, next) => {
    await measure($)

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const state = await read($, view)
    if (e.props.hasSurvey || state === null) return next(e)

    const { Box, Text } = $.ui.resolve(e)
    const percent = state.context.percent ?? 0
    const sep = <Text dimColor> | </Text>

    return (
      <Box marginTop={1}>
        <Text color={options.textColor}>
          {options.folderIcon && `${options.folderIcon} `}
          {state.folder}
        </Text>
        {state.model && sep}
        {state.model && (
          <Text color={options.textColor}>
            {options.modelIcon && `${options.modelIcon} `}
            {state.model}
            {state.effort && ` - ${state.effort}`}
          </Text>
        )}
        {sep}
        <Text color={contextTone(percent, options)}>
          {kilo(state.context.tokens ?? 0)}/{kilo(state.context.window)} ({percent}%)
        </Text>
        {state.limits.map(limit => {
          const { filled, track } = meter(limit.percentUsed)
          const resets = limit.resetsAt ? Date.parse(limit.resetsAt) : Number.NaN
          const isFiveHour = limit.kind === 'five_hour'
          const showsReset = isFiveHour ? options.showFiveHourReset : options.showWeeklyReset
          return (
            <Box key={limit.kind}>
              {sep}
              <Text color={options.textColor}>{LIMITS[limit.kind]} </Text>
              <Text color={usageTone(limit.percentUsed)}>{filled}</Text>
              <Text dimColor>{track}</Text>
              <Text color={options.textColor}> {Math.round(limit.percentUsed)}%</Text>
              {showsReset && Number.isFinite(resets) && (
                <Text color={options.textColor} dimColor>
                  {' ↺ resets '}
                  {isFiveHour ? `in ${resetIn(resets, now)}` : resetAt(resets, offsetMin)}
                </Text>
              )}
            </Box>
          )
        })}
      </Box>
    )
  })
}
