import { expect, test } from 'claude-code/testing'

const BAND = { plugin: 'glance', component: 'AbovePrompt', props: { hasSurvey: false } } as const

const NOW = Date.parse('2026-10-29T12:00:00Z')

test('the band shows folder, model, context and both limits', async ($, on) => {
  on('process.run', () => ({ value: { stdout: '+0100\n', stderr: '', exitCode: 0 } }))
  on('settings.read', () => ({ value: { model: 'opus', effortLevel: 'medium' } }))
  on('clock.now', () => ({ value: NOW }))
  on('clock.every', () => ({ value: undefined }))
  on('session.usage', () => ({
    value: {
      startedAt: NOW,
      context: { tokens: 300_000, window: 1_000_000, percent: 30 },
      rateLimits: [
        { kind: 'five_hour', percentUsed: 7, resetsAt: '2026-10-29T15:29:00Z' },
        { kind: 'seven_day', percentUsed: 98, resetsAt: '2026-10-31T19:59:00Z' },
      ],
    },
  }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/home/dev/my-app', surface: 'terminal', isInteractive: true })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect((await ui.find({ type: 'Text', text: /my-app/ }))?.text).toBe('📁 my-app')
    expect((await ui.find({ type: 'Text', text: /Opus/ }))?.text).toBe('⚙️ Opus - medium')
    expect((await ui.find({ type: 'Text', text: /1000k/ }))?.text).toBe('300k/1000k (30%)')
    expect((await ui.find({ type: 'Text', text: /resets in/ }))?.text).toBe(' ↺ resets in 3 hr 29 min')
    expect((await ui.find({ type: 'Text', text: /resets Sat/ }))?.text).toBe(' ↺ resets Sat 31 Oct 20:59')
    await ui.unmount()
  }
})

test('the reset times can be hidden', { options: { showFiveHourReset: false, showWeeklyReset: false } }, async ($, on) => {
  on('process.run', () => ({ value: { stdout: '+0100\n', stderr: '', exitCode: 0 } }))
  on('settings.read', () => ({ value: {} }))
  on('clock.now', () => ({ value: NOW }))
  on('clock.every', () => ({ value: undefined }))
  on('session.usage', () => ({
    value: {
      startedAt: NOW,
      context: { window: 1_000_000 },
      rateLimits: [
        { kind: 'five_hour', percentUsed: 7, resetsAt: '2026-10-29T15:29:00Z' },
        { kind: 'seven_day', percentUsed: 98, resetsAt: '2026-10-31T19:59:00Z' },
      ],
    },
  }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start({ cwd: '/tmp/demo', surface: 'terminal', isInteractive: true })
  const ui = await $.ui.mount({ ...BAND, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /98%/ }))?.text).toBe(' 98%')
  expect(await ui.find({ type: 'Text', text: /resets/ })).toBeUndefined()
  await ui.unmount()
})
