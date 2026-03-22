import { ethers } from 'ethers'
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const RPC_URL = 'https://testnet.hashio.io/api'

const TASK_REGISTRY_ABI = [
  'function getTaskProviders(bytes32 _taskId) external view returns (address[])',
]

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const taskId = searchParams.get('taskId')
    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
    }

    const deploymentPath = path.join(process.cwd(), '..', 'deployments', 'hederaTestnet.json')
    const taskRegistryAddress = process.env.TASK_REGISTRY_ADDRESS || (
      fs.existsSync(deploymentPath)
        ? JSON.parse(fs.readFileSync(deploymentPath, 'utf8')).contracts.TaskRegistry
        : ''
    )
    if (!taskRegistryAddress) {
      return NextResponse.json({ error: 'TaskRegistry address not configured' }, { status: 500 })
    }

    const rpcProvider = new ethers.JsonRpcProvider(RPC_URL)
    const registry = new ethers.Contract(taskRegistryAddress, TASK_REGISTRY_ABI, rpcProvider)

    const providers: string[] = await (registry as any).getTaskProviders(taskId)

    return NextResponse.json({ providers })
  } catch (err: any) {
    console.error('Error fetching task providers:', err)
    return NextResponse.json({ error: err.message || 'Failed to fetch task providers' }, { status: 500 })
  }
}
