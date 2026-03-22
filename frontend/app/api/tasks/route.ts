import { ethers } from 'ethers'
import { NextResponse } from 'next/server'
import { Client, PrivateKey, TopicMessageSubmitTransaction } from '@hashgraph/sdk'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

const RPC_URL = 'https://testnet.hashio.io/api'

const TASK_REGISTRY_ABI = [
  'function getAllTasks(uint256 _offset, uint256 _limit) external view returns (bytes32[])',
  'function getTask(bytes32 _taskId) external view returns (tuple(bytes32 taskId, address requester, uint8 taskType, bytes32 inputHash, uint256 reward, uint256 stakeRequired, uint256 minProviders, uint256 deadline, uint256 createdAt, bytes32 hcsTaskTopic, uint8 state, bytes32 consensusResult, uint256 agreementRatio))',
  'function getTaskCount() external view returns (uint256)',
  'function getTaskProviders(bytes32 _taskId) external view returns (address[])',
]

const TASK_TYPES = [
  'CLASSIFICATION',
  'EXTRACTION',
  'SCORING',
  'PREDICTION',
  'VERIFICATION'
]

const TASK_STATES = [
  'OPEN',
  'CLAIMED',
  'CONSENSUS',
  'SETTLED',
  'DISPUTED'
]

function loadEnvForRoute() {
  dotenv.config({ path: path.join(process.cwd(), '.env.local') })
  dotenv.config({ path: path.join(process.cwd(), '.env') })
  dotenv.config({ path: path.join(process.cwd(), '..', '.env.local') })
  dotenv.config({ path: path.join(process.cwd(), '..', '.env') })
}

export async function GET(req: Request) {
  try {
    const deploymentPath = path.join(process.cwd(), '..', 'deployments', 'hederaTestnet.json')
    const taskRegistryAddress = process.env.TASK_REGISTRY_ADDRESS || (
      fs.existsSync(deploymentPath)
        ? JSON.parse(fs.readFileSync(deploymentPath, 'utf8')).contracts.TaskRegistry
        : ''
    )
    if (!taskRegistryAddress) {
      return NextResponse.json({ error: 'TaskRegistry address not configured' }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const taskId = searchParams.get('taskId')
    const requester = searchParams.get('requester')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    const rpcProvider = new ethers.JsonRpcProvider(RPC_URL)
    const registry = new ethers.Contract(taskRegistryAddress, TASK_REGISTRY_ABI, rpcProvider)

    if (taskId) {
      try {
        const t = await (registry as any).getTask(taskId)
        const providers = await (registry as any).getTaskProviders(taskId)
        return NextResponse.json({
          taskId: t.taskId,
          requester: t.requester,
          taskType: TASK_TYPES[Number(t.taskType)] || 'UNKNOWN',
          taskTypeIndex: Number(t.taskType),
          inputHash: t.inputHash,
          reward: (Number(t.reward) / 1e8).toFixed(2),
          stakeRequired: (Number(t.stakeRequired) / 1e8).toFixed(2),
          minProviders: Number(t.minProviders),
          deadline: Number(t.deadline),
          createdAt: Number(t.createdAt),
          state: TASK_STATES[Number(t.state)] || 'OPEN',
          stateIndex: Number(t.state),
          providerCount: providers.length,
          hcsTopic: t.hcsTaskTopic,
          providers: providers
        })
      } catch (e: any) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }
    }

    // Get total task count
    const totalCount = await (registry as any).getTaskCount()
    const count = Number(totalCount)

    if (count === 0) {
      return NextResponse.json({ tasks: [], total: 0 })
    }

    // To get the LATEST tasks first, we pull from the end of the array
    // if offset=0 and limit=20, we want the last 20 tasks.
    const startIdx = Math.max(0, count - offset - limit)
    const fetchLimit = Math.min(limit, count - offset)
    
    if (fetchLimit <= 0) {
      return NextResponse.json({ tasks: [], total: count })
    }

    const taskIds: string[] = await (registry as any).getAllTasks(startIdx, fetchLimit)
    // Reverse them to have the absolute newest at index 0
    const reversedIds = [...taskIds].reverse()

    // Fetch details for each task
    const tasks = await Promise.all(
      reversedIds.map(async (id) => {
        try {
          const t = await (registry as any).getTask(id)
          const providers = await (registry as any).getTaskProviders(id)
          
          return {
            taskId: t.taskId,
            requester: t.requester,
            taskType: TASK_TYPES[Number(t.taskType)] || 'UNKNOWN',
            reward: (Number(t.reward) / 1e8).toFixed(2), // tinybars (8 decimals) to HBAR
            stakeRequired: (Number(t.stakeRequired) / 1e8).toFixed(2),
            minProviders: Number(t.minProviders),
            deadline: Number(t.deadline),
            createdAt: Number(t.createdAt),
            state: TASK_STATES[Number(t.state)] || 'OPEN',
            providerCount: providers.length,
            hcsTopic: t.hcsTaskTopic
          }
        } catch (e) {
          console.error(`Error fetching task ${id}:`, e)
          return null
        }
      })
    )

    const filteredTasks = tasks.filter(Boolean)

    if (requester) {
      return NextResponse.json({
        tasks: filteredTasks.filter((t: any) => t.requester.toLowerCase() === requester.toLowerCase()),
        total: count
      })
    }

    return NextResponse.json({ tasks: filteredTasks, total: count })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    loadEnvForRoute()
    const body = await req.json()
    const { taskId, taskType, inputHash, inputEndpoint, topicId } = body || {}

    if (!taskId || !taskType || !inputHash) {
      return NextResponse.json({ error: 'taskId, taskType, and inputHash are required' }, { status: 400 })
    }

    const accountId = process.env.HEDERA_ACCOUNT_ID
    const privateKey = process.env.HEDERA_PRIVATE_KEY
    const tasksTopic = (topicId && topicId.startsWith('0.0')) 
      ? topicId 
      : (process.env.TASKS_TOPIC || '0.0.8309839')

    if (!accountId || !privateKey) {
      return NextResponse.json({ error: 'Server Hedera credentials not configured' }, { status: 500 })
    }

    const client = Client.forTestnet()
    client.setOperator(accountId, PrivateKey.fromString(privateKey))

    const payload = {
      taskId,
      taskType,
      inputHash,
      inputEndpoint: inputEndpoint || 'https://proofclaw.io/tasks/sample_input.json',
    }

    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(tasksTopic)
      .setMessage(JSON.stringify(payload))
      .execute(client)
    const receipt = await tx.getReceipt(client)

    return NextResponse.json({
      success: true,
      topicId: tasksTopic,
      sequenceNumber: receipt.topicSequenceNumber.toString(),
      transactionId: tx.transactionId.toString(),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to publish task to HCS' }, { status: 500 })
  }
}
