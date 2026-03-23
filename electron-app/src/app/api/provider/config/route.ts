export const dynamic = "force-dynamic"
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

// Path from frontend to openclaw-skill
const CONFIG_PATH = path.join(process.cwd(), '../openclaw-skill/config.json')

export async function GET() {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
    return NextResponse.json(config)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const updates = await req.json()
    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'))
    const newConfig = { ...config, ...updates }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2))
    return NextResponse.json(newConfig)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
