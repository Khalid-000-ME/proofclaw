import { NextResponse } from 'next/server'
import axios from 'axios'
import { ethers } from 'ethers'
import fs from 'fs'
import path from 'path'

const TASKS_TOPIC = process.env.TASKS_TOPIC || '0.0.8309839'
const MIRROR_BASE = 'https://testnet.mirrornode.hedera.com'
const RPC_URL = 'https://testnet.hashio.io/api'

const TASK_ESCROW_ABI = [
  'function getPendingRewards(address _provider) external view returns (uint256)',
]

export async function GET(req: Request) {
  try {
    const deploymentPath = path.join(process.cwd(), '..', 'deployments', 'hederaTestnet.json')
    const taskEscrowAddress = process.env.TASK_ESCROW_ADDRESS || (
      fs.existsSync(deploymentPath)
        ? JSON.parse(fs.readFileSync(deploymentPath, 'utf8')).contracts.TaskEscrow
        : ''
    )
    if (!taskEscrowAddress) {
      return NextResponse.json({ error: 'TaskEscrow address not configured' }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const wallet = searchParams.get('wallet')
    if (!wallet) return NextResponse.json({ error: 'wallet is required' }, { status: 400 })

    const { data } = await axios.get(
      `${MIRROR_BASE}/api/v1/topics/${TASKS_TOPIC}/messages`,
      { params: { limit: 200, order: 'desc' } }
    )
    const messages = data?.messages || []

    let commits = 0
    let reveals = 0
    const seenTasks = new Set<string>()
    for (const msg of messages) {
      try {
        const parsed = JSON.parse(Buffer.from(msg.message, 'base64').toString())
        if (String(parsed?.providerId || '').toLowerCase() !== wallet.toLowerCase()) continue
        if (parsed?.type === 'COMMIT') commits += 1
        if (parsed?.type === 'REVEAL') {
          reveals += 1
          if (parsed?.taskId) seenTasks.add(String(parsed.taskId))
        }
      } catch {
        // ignore
      }
    }

    const rpcProvider = new ethers.JsonRpcProvider(RPC_URL)
    const balance = await rpcProvider.getBalance(wallet)
    const escrow = new ethers.Contract(taskEscrowAddress, TASK_ESCROW_ABI, rpcProvider)
    const pendingRewards = await (escrow as any).getPendingRewards(wallet)

    return NextResponse.json({
      commits,
      reveals,
      tasksDone: seenTasks.size,
      walletBalanceHBAR: ethers.formatEther(balance),
      pendingRewardsHBAR: ethers.formatUnits(pendingRewards, 8),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch provider activity' }, { status: 500 })
  }
}

