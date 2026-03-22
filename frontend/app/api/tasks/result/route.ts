import { NextResponse } from 'next/server'
import axios from 'axios'

const TASKS_TOPIC = process.env.TASKS_TOPIC || '0.0.8309839'
const MIRROR_BASE = 'https://testnet.mirrornode.hedera.com'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const taskId = searchParams.get('taskId')
    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
    }

    const { data } = await axios.get(
      `${MIRROR_BASE}/api/v1/topics/${TASKS_TOPIC}/messages`,
      { params: { limit: 100, order: 'desc' } }
    )

    const messages = data?.messages || []
    const results = []
    for (const msg of messages) {
      try {
        const decoded = Buffer.from(msg.message, 'base64').toString()
        const parsed = JSON.parse(decoded)
        if (parsed?.type === 'REVEAL' && parsed?.taskId?.toLowerCase() === taskId.toLowerCase()) {
          results.push({
            providerId: parsed.providerId || '',
            result: parsed.result || '',
            resultHash: parsed.resultHash || '',
            resultEndpoint: parsed.resultEndpoint || '',
            sequenceNumber: msg.sequence_number,
            consensusTimestamp: msg.consensus_timestamp,
          })
        }
      } catch {
        // Ignore non-JSON messages
      }
    }

    if (results.length > 0) {
      return NextResponse.json({ success: true, results })
    }

    return NextResponse.json({ success: false, results: [], error: 'No reveal found yet' }, { status: 404 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch task result' }, { status: 500 })
  }
}

