export const dynamic = "force-dynamic"
import { NextResponse } from 'next/server'
import { getProviderStatus, startProvider, stopProvider } from '@/lib/providerProcess'

export async function GET() {
  return NextResponse.json(getProviderStatus())
}

export async function POST(req: Request) {
  try {
    const { action } = await req.json()
    if (action === 'start') return NextResponse.json(startProvider())
    if (action === 'stop') return NextResponse.json(stopProvider())
    return NextResponse.json({ error: 'action must be start or stop' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to control provider' }, { status: 500 })
  }
}

