export const dynamic = "force-dynamic"
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await fetch('http://localhost:11434/api/tags')
    if (!response.ok) throw new Error('Ollama not reachable')
    const data = await response.json()
    // Return simple array of model names
    const models = data.models.map((m: any) => m.name)
    return NextResponse.json({ models })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, models: [] }, { status: 500 })
  }
}
