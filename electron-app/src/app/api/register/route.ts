export const dynamic = 'force-dynamic'
import { ethers } from 'ethers'
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const METADATA_URI = 'https://proofclaw.io/providers/metadata/default.json'
const RPC_URL = 'https://testnet.hashio.io/api'

const PROVIDER_REGISTRY_ABI = [
  'function register(bytes32 _hcsAgentId, string calldata _metadataURI) external payable',
  'function getProvider(address _provider) external view returns (tuple(address providerAddress, bytes32 hcsAgentId, uint256 stakedHBAR, uint256 totalTasksCompleted, uint256 totalTasksSlashed, uint256 reputationScore, uint256 proofTokensEarned, bool isActive, uint256 registeredAt, string metadataURI))',
]

export async function POST(req: Request) {
  try {
    const deploymentPath = path.join(process.cwd(), 'deployments', 'hederaTestnet.json')
    const providerRegistryAddress = process.env.PROVIDER_REGISTRY_ADDRESS || (
      fs.existsSync(deploymentPath)
        ? JSON.parse(fs.readFileSync(deploymentPath, 'utf8')).contracts.ProviderRegistry
        : ''
    )
    if (!providerRegistryAddress) {
      return NextResponse.json({ error: 'ProviderRegistry address not configured' }, { status: 500 })
    }

    const body = await req.json()
    const { evmPrivateKey, registrationStake } = body

    if (!evmPrivateKey) {
      return NextResponse.json({ error: 'evmPrivateKey is required' }, { status: 400 })
    }

    const rpcProvider = new ethers.JsonRpcProvider(RPC_URL)
    const wallet = new ethers.Wallet(evmPrivateKey, rpcProvider)

    const providerRegistry = new ethers.Contract(providerRegistryAddress, PROVIDER_REGISTRY_ABI, wallet)

    // Derive hcsAgentId — same logic as register-provider.ts:
    // keccak256(toUtf8Bytes(`proofclaw_provider_${address}_${Date.now()}`))
    const hcsAgentId = ethers.keccak256(
      ethers.toUtf8Bytes(`proofclaw_provider_${wallet.address}_${Date.now()}`)
    )

    // Standardized registration stake minimum: 1 HBAR
    const stake = Math.max(1, Number(registrationStake) || 1)
    const stakeAmount = ethers.parseEther(stake.toString())

    const TX_OVERRIDES = {
    gasLimit: BigInt(1_000_000),
    gasPrice: BigInt('1200000000000'),
    }

    const tx = await (providerRegistry as any).register(hcsAgentId, METADATA_URI, {
      value: stakeAmount,
      ...TX_OVERRIDES,
    })

    const receipt = await tx.wait()

    // Fetch on-chain provider info to return to the UI
    let providerData = null
    try {
      const info = await (providerRegistry as any).getProvider(wallet.address)
      providerData = {
        isActive: info.isActive,
        stakedHBAR: ethers.formatUnits(info.stakedHBAR, 8) + ' HBAR',
        reputationScore: (Number(info.reputationScore) / 100).toFixed(2) + ' / 100',
        registeredAt: new Date(Number(info.registeredAt) * 1000).toLocaleString(),
        hcsAgentId,
      }
    } catch {
      // Non-fatal — tx still succeeded
    }

    return NextResponse.json({
      success: true,
      txHash: receipt.hash,
      gasUsed: receipt.gasUsed?.toString(),
      address: wallet.address,
      hcsAgentId,
      providerInfo: providerData,
    })
  } catch (err: any) {
    const msg: string = err?.reason || err?.shortMessage || err?.message || 'Unknown error'
    // Friendly messages for known reverts
    if (msg.includes('Already registered')) {
      return NextResponse.json({ error: 'This address is already registered as a provider.' }, { status: 409 })
    }
    if (msg.includes('Agent ID in use')) {
      return NextResponse.json({ error: 'HCS Agent ID already in use. Please try again.' }, { status: 409 })
    }
    if (msg.includes('Minimum 1 HBAR')) {
      return NextResponse.json({ error: 'Minimum registration stake is 1 HBAR.' }, { status: 400 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
