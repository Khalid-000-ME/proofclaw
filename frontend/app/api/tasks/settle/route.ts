import { NextResponse } from 'next/server'
import { ethers } from 'ethers'
import path from 'path'
import dotenv from 'dotenv'
import fs from 'fs'

const RPC_URL = 'https://testnet.hashio.io/api'

const TASK_ESCROW_ABI = [
  'function settleTask(bytes32 _taskId, address[] calldata _agreeingProviders, address[] calldata _dissentingProviders, uint256 _totalReward) external',
]
const TASK_REGISTRY_ABI = [
  'function getTask(bytes32 _taskId) external view returns (tuple(bytes32 taskId,address requester,uint8 taskType,bytes32 inputHash,uint256 reward,uint256 stakeRequired,uint256 minProviders,uint256 deadline,uint256 createdAt,bytes32 hcsTaskTopic,uint8 state,bytes32 consensusResult,uint256 agreementRatio))',
]
const PROVIDER_REGISTRY_ABI = [
  'function recordCorrectTask(address _provider) external',
  'function recordSlashedTask(address _provider) external'
]

// HCS client for publishing messages
async function publishToHCS(topicId: string, message: any) {
  try {
    const response = await fetch(`https://testnet.mirrornode.hedera.com/api/v1/topics/${topicId}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.HEDERA_API_KEY || ''}`
      },
      body: JSON.stringify([message])
    })
    
    if (!response.ok) {
      console.error('Failed to publish to HCS:', await response.text())
      return false
    }
    
    const result = await response.json()
    console.log('✅ Published to HCS:', result)
    return true
  } catch (error) {
    console.error('HCS publish error:', error)
    return false
  }
}

function loadEnvForRoute() {
  dotenv.config({ path: path.join(process.cwd(), '.env.local') })
  dotenv.config({ path: path.join(process.cwd(), '.env') })
  dotenv.config({ path: path.join(process.cwd(), '..', '.env.local') })
  dotenv.config({ path: path.join(process.cwd(), '..', '.env') })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { taskId, agreeingProviders, dissentingProviders } = body
    if (!taskId || !Array.isArray(agreeingProviders) || !Array.isArray(dissentingProviders)) {
      return NextResponse.json({ error: 'taskId, agreeingProviders and dissentingProviders are required' }, { status: 400 })
    }

    if (agreeingProviders.length === 0) {
      return NextResponse.json({ error: 'At least one approved provider is required' }, { status: 400 })
    }

    loadEnvForRoute()
    const privateKey = process.env.CONSENSUS_EVM_PRIVATE_KEY || process.env.EVM_PRIVATE_KEY
    if (!privateKey) return NextResponse.json({ error: 'Server EVM_PRIVATE_KEY not configured' }, { status: 500 })
    const deploymentPath = path.join(process.cwd(), '..', 'deployments', 'hederaTestnet.json')
    const deployment = fs.existsSync(deploymentPath) ? JSON.parse(fs.readFileSync(deploymentPath, 'utf8')) : null
    const taskEscrowAddress = process.env.TASK_ESCROW_ADDRESS || deployment?.contracts?.TaskEscrow
    const taskRegistryAddress = process.env.TASK_REGISTRY_ADDRESS || deployment?.contracts?.TaskRegistry
    const providerRegistryAddress = process.env.PROVIDER_REGISTRY_ADDRESS || deployment?.contracts?.ProviderRegistry
    if (!taskEscrowAddress || !taskRegistryAddress || !providerRegistryAddress) {
      return NextResponse.json({ error: 'Contract addresses not configured' }, { status: 500 })
    }

    const normalize = (addr: string) => ethers.getAddress(String(addr).toLowerCase())
    const normalizedTaskId = ethers.hexlify(ethers.getBytes(taskId))
    const normalizedAgreeing = agreeingProviders.map(normalize)
    const normalizedDissenting = dissentingProviders.map(normalize)

    const rpcProvider = new ethers.JsonRpcProvider(RPC_URL)
    const wallet = new ethers.Wallet(privateKey, rpcProvider)
    const registry = new ethers.Contract(taskRegistryAddress, TASK_REGISTRY_ABI, wallet)
    const escrow = new ethers.Contract(taskEscrowAddress, TASK_ESCROW_ABI, wallet)
    const providerRegistry = new ethers.Contract(providerRegistryAddress, PROVIDER_REGISTRY_ABI, wallet)

    const task = await registry.getTask(normalizedTaskId)
    const totalReward = task.reward
    // Preflight for clearer revert reasons
    await (escrow as any).settleTask.staticCall(
      normalizedTaskId,
      normalizedAgreeing,
      normalizedDissenting,
      totalReward
    )
    const tx = await (escrow as any).settleTask(
      normalizedTaskId,
      normalizedAgreeing,
      normalizedDissenting,
      totalReward,
      { gasLimit: BigInt(1200000), gasPrice: BigInt('1200000000000') }
    )
    const receipt = await tx.wait()
    
    // Publish settlement result to HCS so providers know they have rewards to withdraw
    const taskData = await registry.getTask(normalizedTaskId)
    if (taskData && taskData.hcsTaskTopic) {
      // Convert bytes32 topic to string and remove null bytes
      const topicIdBytes = ethers.toUtf8Bytes(taskData.hcsTaskTopic)
      const topicId = Buffer.from(topicIdBytes).toString().replace(/\0/g, '')
      
      for (let i = 0; i < normalizedAgreeing.length; i++) {
        const provider = normalizedAgreeing[i]
        const rewardPerProvider = totalReward / BigInt(normalizedAgreeing.length)
        
        await publishToHCS(topicId, {
          task_id: normalizedTaskId,
          provider_id: provider,
          reward_amount: rewardPerProvider.toString(),
          status: 'SETTLED',
          message: `Task settled. You earned ${ethers.formatUnits(rewardPerProvider, 8)} HBAR. Withdraw available.`,
          timestamp: Math.floor(Date.now() / 1000)
        })
      }
    }

    // INTERNAL LOGIC: Update Provider Reputations on-chain using ProviderRegistry
    for (const p of normalizedAgreeing) {
      try {
        const txx = await providerRegistry.recordCorrectTask(p, { gasLimit: BigInt(500000), gasPrice: BigInt('1200000000000') })
        await txx.wait()
      } catch (e) {
        console.error('Failed to augment rep for correct provider', p, e)
      }
    }
    for (const dp of normalizedDissenting) {
      try {
        const txx = await providerRegistry.recordSlashedTask(dp, { gasLimit: BigInt(500000), gasPrice: BigInt('1200000000000') })
        await txx.wait()
      } catch (e) {
        console.error('Failed to slash rep for dissenting provider', dp, e)
      }
    }
    
    return NextResponse.json({
      success: true,
      txHash: receipt.hash,
      explorerUrl: `https://hashscan.io/testnet/transaction/${receipt.hash}`,
    })
  } catch (err: any) {
    return NextResponse.json({ 
      error: err.shortMessage || err.message || 'Settlement failed' 
    }, { status: 500 })
  }
}
