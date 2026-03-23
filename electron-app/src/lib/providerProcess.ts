import { fork, ChildProcess } from 'child_process'
import path from 'path'
import fs from 'fs'

let activeProcess: ChildProcess | null = null

export function getProviderStatus() {
  return { running: activeProcess !== null && !activeProcess.killed }
}

export function startProvider() {
  if (activeProcess && !activeProcess.killed) {
    return { success: false, error: 'Provider is already running' }
  }

  // Find the exact path to node.js using paths that work both in dev and prod
  let scriptPath = path.join(process.cwd(), 'src', 'provider', 'node.js')
  if (!fs.existsSync(scriptPath)) {
    // maybe .next build path or electron packaged path
    scriptPath = path.join(process.cwd(), 'provider', 'node.js')
  }

  try {
    activeProcess = fork(scriptPath, [], {
      stdio: 'pipe',
      cwd: process.cwd()
    })

    if (activeProcess.stdout) {
      activeProcess.stdout.on('data', (data) => console.log(`[PROVIDER NODE] ${data.toString().trim()}`))
    }
    if (activeProcess.stderr) {
      activeProcess.stderr.on('data', (data) => console.error(`[PROVIDER NODE ERR] ${data.toString().trim()}`))
    }

    activeProcess.on('error', (err) => {
      console.error('[PROVIDER NODE ERROR]', err)
      activeProcess = null
    })

    activeProcess.on('exit', (code) => {
      console.log(`[PROVIDER NODE] Process exited with code ${code}`)
      activeProcess = null
    })

    return { success: true, message: 'Provider process started successfully' }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to spawn process' }
  }
}

export function stopProvider() {
  if (!activeProcess || activeProcess.killed) {
    return { success: true, message: 'Provider was not running' }
  }

  try {
    activeProcess.kill()
    activeProcess = null
    return { success: true, message: 'Provider stopped' }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to kill process' }
  }
}
