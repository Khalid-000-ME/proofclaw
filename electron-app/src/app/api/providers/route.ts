export const dynamic = "force-dynamic"
import { ethers } from 'ethers'
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const RPC_URL = 'https://testnet.hashio.io/api'

const PROVIDER_REGISTRY_ABI = [
  'function getProvider(address _provider) external view returns (tuple(address providerAddress, bytes32 hcsAgentId, uint256 stakedHBAR, uint256 totalTasksCompleted, uint256 totalTasksSlashed, uint256 reputationScore, uint256 proofTokensEarned, bool isActive, uint256 registeredAt, string metadataURI))',
  'function getAllProviders(uint256 _offset, uint256 _limit) external view returns (address[])',
  'function getProviderCount() external view returns (uint256)',
]

export async function GET(req: Request) {
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

    const { searchParams } = new URL(req.url)
    const wallet = searchParams.get('wallet')

    const rpcProvider = new ethers.JsonRpcProvider(RPC_URL)
    const registry = new ethers.Contract(providerRegistryAddress, PROVIDER_REGISTRY_ABI, rpcProvider)

    if (wallet) {
      // Fetch a single provider by wallet address
      const addresses = wallet.split(',').map((a) => a.trim()).filter(Boolean)
      
      const results = await Promise.all(
        addresses.map(async (addr) => {
          try {
            const checksummed = ethers.getAddress(addr)
            const p = await (registry as any).getProvider(checksummed)
            const formatted = formatProvider(p, checksummed)
            return formatted.isActive ? formatted : null
          } catch (e) {
            console.error('[DEBUG] getProvider failed for', addr, e)
            return null
          }
        })
      )

      return NextResponse.json({ providers: results.filter(Boolean) })
    }

    // Fetch all providers (paginated)
    const countBig = await (registry as any).getProviderCount()
    const count = Number(countBig)

    if (count === 0) return NextResponse.json({ providers: [], total: 0 })

    // Fetch all (capped at 100 for safety)
    const limit = Math.min(count, 100)
    const addresses: string[] = await (registry as any).getAllProviders(0, limit)

    const providers = await Promise.all(
      addresses.map(async (addr) => {
        try {
          const p = await (registry as any).getProvider(addr)
          return formatProvider(p, addr)
        } catch {
          return null
        }
      })
    )

    return NextResponse.json({ providers: providers.filter(Boolean), total: count })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch providers' }, { status: 500 })
  }
}

function formatProvider(p: any, address: string) {
  const stakedRaw = BigInt(p.stakedHBAR.toString())
  const reputationRaw = Number(p.reputationScore)
  const proofRaw = BigInt(p.proofTokensEarned.toString())

  // Hedera tinybars/contract uses 8 decimals for HBAR
  const formatTiny = (val: bigint) => (Number(val) / 1e8).toFixed(2)

  return {
    address,
    hcsAgentId: p.hcsAgentId,
    isActive: p.isActive,
    stakedHBAR: formatTiny(stakedRaw),
    totalTasksCompleted: Number(p.totalTasksCompleted),
    totalTasksSlashed: Number(p.totalTasksSlashed),
    reputationScore: (reputationRaw / 100).toFixed(1),
    proofTokensEarned: formatTiny(proofRaw),
    registeredAt: Number(p.registeredAt),
    metadataURI: p.metadataURI,
  }
}
