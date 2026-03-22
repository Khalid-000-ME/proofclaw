'use client'

import { useState, useEffect, useCallback } from 'react'

import { Cpu, Hexagon, ArrowClockwise, Plus, Robot } from '@phosphor-icons/react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Provider {
  address: string
  hcsAgentId: string
  isActive: boolean
  stakedHBAR: string
  totalTasksCompleted: number
  totalTasksSlashed: number
  reputationScore: string
  proofTokensEarned: string
  registeredAt: number
  metadataURI: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function repColor(score: string) {
  const n = parseFloat(score)
  if (n >= 90) return 'text-semantic-consensus'
  if (n >= 70) return 'text-semantic-pending'
  return 'text-semantic-dispute'
}

function repBar(score: string) {
  const n = Math.min(100, parseFloat(score))
  const color = parseFloat(score) >= 90 ? 'bg-semantic-consensus' : parseFloat(score) >= 70 ? 'bg-semantic-pending' : 'bg-semantic-dispute'
  return { width: `${n}%`, color }
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`
}

function shortAgent(id: string) {
  return `${id.slice(0, 10)}…${id.slice(-6)}`
}

function timeAgo(ts: number) {
  if (!ts) return '—'
  const diff = Date.now() / 1000 - ts
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ─── Provider Card (my providers) ────────────────────────────────────────────

function MyProviderCard({ p, isYours }: { p: Provider; isYours: boolean }) {
  const bar = repBar(p.reputationScore)
  const correctTasks = p.totalTasksCompleted - p.totalTasksSlashed

  return (
    <div className={`bg-bg-2 border rounded-2xl p-6 transition-all duration-200 ${isYours ? 'border-brand-red' : 'border-border'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${p.isActive ? 'bg-semantic-consensus-dim' : 'bg-bg-3'}`}>
            <Cpu className={`w-5 h-5 ${p.isActive ? 'text-semantic-consensus' : 'text-text-3'}`} />
          </div>
          <div>
            <p className="font-mono text-sm font-bold text-text-1">{shortAddr(p.address)}</p>
            <p className="text-xs text-text-3 font-mono mt-0.5">HCS: {shortAgent(p.hcsAgentId)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isYours && (
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-brand-red-dim border border-brand-red text-brand-red">
              yours
            </span>
          )}
          <span className={`text-xs font-mono px-2.5 py-1 rounded-full border ${p.isActive ? 'bg-semantic-consensus-dim border-semantic-consensus text-semantic-consensus' : 'bg-bg-3 border-border text-text-3'}`}>
            {p.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Staked', value: `${p.stakedHBAR} ℏ`, color: 'text-text-1' },
          { label: 'Tasks', value: p.totalTasksCompleted, color: 'text-text-1' },
          { label: 'Slashed', value: p.totalTasksSlashed, color: p.totalTasksSlashed > 0 ? 'text-semantic-dispute' : 'text-text-1' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-bg-3 rounded-xl p-3">
            <p className="text-xs text-text-3 font-mono uppercase tracking-wider mb-1">{label}</p>
            <p className={`font-mono text-sm font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Reputation bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-text-3 font-mono uppercase tracking-wider">Reputation</span>
          <span className={`font-mono text-sm font-bold ${repColor(p.reputationScore)}`}>{p.reputationScore} / 100</span>
        </div>
        <div className="w-full h-1.5 bg-bg-3 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${bar.color}`} style={{ width: bar.width }} />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-1.5">
          <Hexagon className="w-3.5 h-3.5 text-brand-orange" />
          <span className="font-mono text-sm text-brand-orange font-bold">{p.proofTokensEarned} PROOF</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-3 font-mono">Registered {timeAgo(p.registeredAt)}</span>
          <a
            href={`https://hashscan.io/testnet/account/${p.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-brand-red hover:underline font-mono"
          >
            HashScan ↗
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── Table row (all providers) ────────────────────────────────────────────────

function ProviderRow({ p, walletAddress }: { p: Provider; walletAddress: string }) {
  const bar = repBar(p.reputationScore)
  const isYours = walletAddress.toLowerCase() === p.address.toLowerCase()

  return (
    <tr className={`border-b border-border table-row-hover transition-colors ${isYours ? 'bg-brand-red-faint' : ''}`}>
      <td className="py-3.5 px-6">
        <div className="flex items-center gap-2.5">
          <Cpu className={`w-4 h-4 ${isYours ? 'text-brand-red' : 'text-text-3'}`} />
          <div>
            <p className="font-mono text-[13px] text-text-1">{shortAddr(p.address)}</p>
            {isYours && <p className="text-[10px] font-mono text-brand-red">← yours</p>}
          </div>
        </div>
      </td>
      <td className="py-3.5 px-6 text-center">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase border ${p.isActive ? 'bg-semantic-consensus-dim text-semantic-consensus border-semantic-consensus' : 'bg-bg-3 text-text-3 border-border'}`}>
          {p.isActive ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="py-3.5 px-6 text-right">
        <span className="font-mono text-[13px] text-text-1">{p.stakedHBAR} ℏ</span>
      </td>
      <td className="py-3.5 px-6 text-right">
        <span className="font-mono text-[13px] text-text-1">{p.totalTasksCompleted}</span>
      </td>
      <td className="py-3.5 px-6 text-right">
        <span className={`font-mono text-[13px] ${p.totalTasksSlashed > 0 ? 'text-semantic-dispute' : 'text-text-3'}`}>{p.totalTasksSlashed}</span>
      </td>
      <td className="py-3.5 px-6 text-right">
        <div className="flex items-center justify-end gap-1">
          <Hexagon className="w-3 h-3 text-brand-orange" />
          <span className="font-mono text-[13px] text-brand-orange">{p.proofTokensEarned}</span>
        </div>
      </td>
      <td className="py-3.5 px-6">
        <div className="flex items-center gap-2 justify-end">
          <div className="w-16 h-1 bg-bg-3 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${bar.color}`} style={{ width: bar.width }} />
          </div>
          <span className={`font-mono text-[13px] w-12 text-right ${repColor(p.reputationScore)}`}>{p.reputationScore}</span>
        </div>
      </td>
    </tr>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProvidersPage() {
  const [walletAddress, setWalletAddress] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [myProviders, setMyProviders] = useState<Provider[]>([])
  const [allProviders, setAllProviders] = useState<Provider[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [myLoading, setMyLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'mine' | 'all'>('mine')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  // ── Connect wallet ──────────────────────────────────────────────────────────
  async function connectWallet() {
    const eth = (window as any).ethereum
    if (!eth) { setError('MetaMask not found.'); return }
    setConnecting(true)
    try {
      const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' })
      if (accounts[0]) setWalletAddress(accounts[0])
    } finally {
      setConnecting(false)
    }
  }

  // Listen for account changes
  useEffect(() => {
    const eth = (window as any).ethereum
    if (!eth) return
    const handler = (accounts: string[]) => setWalletAddress(accounts[0] || '')
    eth.on('accountsChanged', handler)
    // Try to get already-connected account silently
    eth.request({ method: 'eth_accounts' }).then((accs: string[]) => {
      if (accs[0]) setWalletAddress(accs[0])
    }).catch(() => {})
    return () => eth.removeListener('accountsChanged', handler)
  }, [])

  // ── Fetch my providers ──────────────────────────────────────────────────────
  const fetchMyProviders = useCallback(async () => {
    if (!walletAddress) return
    setMyLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/providers?wallet=${walletAddress}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMyProviders(data.providers)
      setLastRefresh(new Date())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setMyLoading(false)
    }
  }, [walletAddress])

  // ── Fetch all providers ─────────────────────────────────────────────────────
  const fetchAllProviders = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/providers')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setAllProviders(data.providers)
      setTotal(data.total)
      setLastRefresh(new Date())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMyProviders() }, [fetchMyProviders])
  useEffect(() => { fetchAllProviders() }, [fetchAllProviders])

  const isLoading = tab === 'mine' ? myLoading : loading

  return (
    <div className="min-h-screen bg-bg">

      <main className="p-6 lg:p-10 max-w-screen-xl mt-[100px] mx-auto">

          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="font-mono text-[24px] font-bold text-text-1 mb-1">PROVIDER REGISTRY</h1>
              <p className="text-sm text-text-2">
                {total > 0 ? `${total} provider${total !== 1 ? 's' : ''} registered on-chain` : 'Live data from ProviderRegistry contract'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {lastRefresh && (
                <span className="text-xs text-text-3 font-mono">
                  Updated {lastRefresh.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={() => { fetchMyProviders(); fetchAllProviders() }}
                disabled={isLoading}
                className="flex items-center gap-1.5 text-xs text-text-2 hover:text-text-1 px-3 py-2 rounded-full border border-border hover:border-border-2 transition-all disabled:opacity-40"
              >
                <ArrowClockwise className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <Link href="/register">
                <button className="flex items-center gap-1.5 bg-brand-red hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-full transition-all">
                  <Plus className="w-3.5 h-3.5" />
                  Register New
                </button>
              </Link>
            </div>
          </div>

          {/* Wallet connect banner */}
          {!walletAddress && (
            <div className="bg-brand-red-faint border border-border-red rounded-2xl p-5 mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Robot className="w-5 h-5 text-brand-red flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-text-1">Connect your wallet to see your providers</p>
                  <p className="text-xs text-text-2 mt-0.5">You can still browse all registered providers below.</p>
                </div>
              </div>
              <button
                onClick={connectWallet}
                disabled={connecting}
                className="bg-brand-red hover:bg-red-700 text-white text-sm font-semibold px-5 py-2 rounded-full transition-all flex-shrink-0"
              >
                {connecting ? 'Connecting…' : '🦊 Connect'}
              </button>
            </div>
          )}

          {/* Connected wallet info */}
          {walletAddress && (
            <div className="bg-bg-2 border border-border rounded-2xl px-5 py-3.5 mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-semantic-consensus animate-pulse" />
                <span className="font-mono text-sm text-text-1">{walletAddress}</span>
                <span className="text-xs text-text-3">connected</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-semantic-dispute/10 border border-semantic-dispute/30 rounded-xl p-3 mb-6 text-xs text-semantic-dispute font-mono">
              {error}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-bg-2 border border-border rounded-full p-1 w-fit">
            {([['mine', 'My Providers'], ['all', 'All Providers']] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`text-sm font-medium px-5 py-1.5 rounded-full transition-all ${tab === id ? 'bg-brand-red text-white' : 'text-text-2 hover:text-text-1'}`}
              >
                {label}
                {id === 'mine' && myProviders.length > 0 && (
                  <span className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${tab === 'mine' ? 'bg-white/20' : 'bg-bg-3'}`}>{myProviders.length}</span>
                )}
                {id === 'all' && total > 0 && (
                  <span className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${tab === 'all' ? 'bg-white/20' : 'bg-bg-3'}`}>{total}</span>
                )}
              </button>
            ))}
          </div>

          {/* ── My Providers tab ── */}
          {tab === 'mine' && (
            <div>
              {!walletAddress ? (
                <div className="text-center py-20 text-text-3">
                  <Cpu className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Connect your wallet to see your providers</p>
                </div>
              ) : myLoading ? (
                <div className="text-center py-20 text-text-3">
                  <div className="w-6 h-6 border-2 border-brand-red border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm">Loading your providers…</p>
                </div>
              ) : myProviders.length === 0 ? (
                <div className="text-center py-20">
                  <Cpu className="w-10 h-10 mx-auto mb-3 text-text-3 opacity-40" />
                  <p className="text-sm text-text-2 mb-1">No providers registered from this wallet</p>
                  <p className="text-xs text-text-3 mb-6">Register a new provider node to start earning rewards</p>
                  <Link href="/register">
                    <button className="bg-brand-red hover:bg-red-700 text-white text-sm font-semibold px-6 py-2.5 rounded-full transition-all">
                      Register Provider
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {myProviders.map((p) => (
                    <MyProviderCard key={p.address} p={p} isYours={walletAddress.toLowerCase() === p.address.toLowerCase()} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── All Providers tab ── */}
          {tab === 'all' && (
            <div className="bg-bg-2 border border-border rounded-2xl overflow-hidden">
              {loading ? (
                <div className="text-center py-20 text-text-3">
                  <div className="w-6 h-6 border-2 border-brand-red border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-sm">Loading all providers…</p>
                </div>
              ) : allProviders.length === 0 ? (
                <div className="text-center py-20 text-text-3">
                  <Cpu className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No providers registered yet</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {['Provider', 'Status', 'Staked', 'Tasks', 'Slashed', 'PROOF', 'Reputation'].map((h) => (
                        <th key={h} className={`font-sans text-[11px] uppercase tracking-widest text-text-3 py-4 px-6 ${h === 'Provider' ? 'text-left' : h === 'Status' ? 'text-center' : 'text-right'}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {allProviders.map((p) => (
                      <ProviderRow key={p.address} p={p} walletAddress={walletAddress} />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

      </main>
    </div>
  )
}
