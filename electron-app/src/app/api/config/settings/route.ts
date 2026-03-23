export const dynamic = "force-dynamic"
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const CONFIG_PATH = path.join(process.cwd(), '.env.local')

export async function GET() {
  try {
    const raw = fs.existsSync(CONFIG_PATH) ? fs.readFileSync(CONFIG_PATH, 'utf8') : ''
    const lines = raw.split('\n')
    const config: any = {}
    
    lines.forEach(line => {
      const [key, ...val] = line.split('=')
      if (key && val.length > 0) {
        // Map .env keys to our UI keys
        const cleanVal = val.join('=').trim()
        if (key === 'HEDERA_ACCOUNT_ID') config.hederaAccountId = cleanVal
        if (key === 'HEDERA_PRIVATE_KEY') config.hederaPrivateKey = cleanVal
        if (key === 'EVM_PRIVATE_KEY') config.evmPrivateKey = cleanVal
        if (key === 'TASKS_TOPIC') config.tasksTopic = cleanVal
        if (key === 'ANTHROPIC_API_KEY') config.anthropicApiKey = cleanVal
        if (key === 'GEMINI_API_KEY') config.geminiApiKey = cleanVal
      }
    })

    // Also load from config.json if exists for hardware specific ones
    const appConfigPath = path.join(process.cwd(), 'config.json')
    if (fs.existsSync(appConfigPath)) {
      const appData = JSON.parse(fs.readFileSync(appConfigPath, 'utf8'))
      Object.assign(config, appData)
    }

    return NextResponse.json(config)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    
    // 1. Update .env.local
    let raw = fs.existsSync(CONFIG_PATH) ? fs.readFileSync(CONFIG_PATH, 'utf8') : ''
    const mapping: Record<string, string> = {
      HEDERA_ACCOUNT_ID: body.hederaAccountId,
      HEDERA_PRIVATE_KEY: body.hederaPrivateKey,
      EVM_PRIVATE_KEY: body.evmPrivateKey,
      TASKS_TOPIC: body.tasksTopic,
      ANTHROPIC_API_KEY: body.anthropicApiKey,
      GEMINI_API_KEY: body.geminiApiKey
    }

    Object.entries(mapping).forEach(([envKey, value]) => {
      if (value === undefined) return
      const regex = new RegExp(`^${envKey}=.*`, 'm')
      if (raw.match(regex)) {
        raw = raw.replace(regex, `${envKey}=${value}`)
      } else {
        raw += `\n${envKey}=${value}`
      }
    })
    
    fs.writeFileSync(CONFIG_PATH, raw.trim() + '\n')

    // 2. Update hardware config.json
    const hardwareConfig = {
      llmProvider: body.llmProvider,
      ollamaModel: body.ollamaModel,
      ollamaUrl: body.ollamaUrl,
      tasksTopic: body.tasksTopic,
      hederaAccountId: body.hederaAccountId, // mirror it for easy node.js access
      hederaPrivateKey: body.hederaPrivateKey,
      evmPrivateKey: body.evmPrivateKey
    }
    
    fs.writeFileSync(path.join(process.cwd(), 'config.json'), JSON.stringify(hardwareConfig, null, 2))

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
