import { spawn, ChildProcessWithoutNullStreams } from 'child_process'
import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'

type ProviderState = {
  process: ChildProcessWithoutNullStreams | null
  running: boolean
  startedAt: number | null
  logs: string[]
}

const g = globalThis as unknown as { __providerState?: ProviderState }

if (!g.__providerState) {
  g.__providerState = { process: null, running: false, startedAt: null, logs: [] }
}

function pushLog(line: string) {
  const state = g.__providerState!
  state.logs.push(line)
  if (state.logs.length > 400) state.logs.shift()
}

/** Read openclaw-skill/.env.local and .env into a plain object */
function loadProviderEnv(): Record<string, string> {
  const rootDir = path.join(process.cwd(), '..')
  const skillDir = path.join(rootDir, 'openclaw-skill')
  const env: Record<string, string> = {}

  for (const file of ['.env', '.env.local']) {
    const p = path.join(skillDir, file)
    if (fs.existsSync(p)) {
      const parsed = dotenv.parse(fs.readFileSync(p))
      Object.assign(env, parsed)
    }
  }

  return env
}

export function startProvider(): { started: boolean; message: string } {
  const state = g.__providerState!
  if (state.running && state.process) return { started: false, message: 'Provider is already running' }

  const rootDir = path.join(process.cwd(), '..')

  // Merge: server env (low priority) + openclaw-skill env vars (high priority)
  const providerEnv = {
    ...process.env,
    ...loadProviderEnv(),
  }

  const child = spawn('node', ['openclaw-skill/provider.js'], {
    cwd: rootDir,
    env: providerEnv,
  })

  state.process = child
  state.running = true
  state.startedAt = Date.now()
  pushLog(`[${new Date().toISOString()}] Provider started`)

  child.stdout.on('data', (d) => pushLog(String(d).trim()))
  child.stderr.on('data', (d) => pushLog(`[ERR] ${String(d).trim()}`))
  child.on('exit', (code) => {
    pushLog(`[${new Date().toISOString()}] Provider exited with code ${code}`)
    state.process = null
    state.running = false
  })

  return { started: true, message: 'Provider started' }
}

export function stopProvider(): { stopped: boolean; message: string } {
  const state = g.__providerState!
  if (!state.running || !state.process) return { stopped: false, message: 'Provider is not running' }
  state.process.kill('SIGTERM')
  state.running = false
  state.process = null
  pushLog(`[${new Date().toISOString()}] Provider stop requested`)
  return { stopped: true, message: 'Provider stopped' }
}

export function getProviderStatus() {
  const state = g.__providerState!
  return {
    running: state.running,
    startedAt: state.startedAt,
    logs: state.logs.slice(-50),
  }
}

