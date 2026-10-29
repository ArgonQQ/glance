export type Glance = {
  folder: string
  model?: string
  effort?: string
  context: { tokens?: number; window: number; percent?: number }
  limits: { kind: string; percentUsed: number; resetsAt?: string }[]
}

declare module 'claude-code' {
  interface PluginState {
    'glance': { view: Glance | null }
  }
}
