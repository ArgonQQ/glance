import { expect, test } from 'claude-code/testing'

import { contextTone, meter, modelName, optionsFrom, parseOffset, resetAt, resetIn } from '../hooks/glance'

const options = optionsFrom({})

test('model ids read as their display name', () => {
  expect(modelName('claude-opus-5-5')).toBe('Opus 5.5')
  expect(modelName('claude-fable-5-1[1m]')).toBe('Fable 5.1')
  expect(modelName('opus')).toBe('Opus')
})

test('context is green to 20%, orange to 35%, red above', () => {
  expect(contextTone(20, options)).toBe('success')
  expect(contextTone(25, options)).toBe('warning')
  expect(contextTone(35, options)).toBe('warning')
  expect(contextTone(36, options)).toBe('error')
})

test('the meter fills in quarter cells', () => {
  expect(meter(0)).toEqual({ filled: '', track: '⡀⡀⡀⡀⡀' })
  expect(meter(7)).toEqual({ filled: '⣀', track: '⡀⡀⡀⡀' })
  expect(meter(100)).toEqual({ filled: '⣿⣿⣿⣿⣿', track: '' })
})

test('resets read as a countdown and as a local day and time', () => {
  expect(resetIn(3 * 3_600_000 + 29 * 60_000, 0)).toBe('3 hr 29 min')
  expect(resetIn(0, 1)).toBe('now')
  expect(parseOffset('+0100\n')).toBe(60)
  expect(resetAt(Date.parse('2026-10-31T19:59:00Z'), 60)).toBe('Sat 31 Oct 20:59')
})
