'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Cpu, Hexagon, ArrowClockwise, Cloud, Gear, Robot, DownloadSimple, Copy, CheckCircle, Wallet } from '@phosphor-icons/react'

type ProviderInfo = {
  address: string
  isActive: boolean
  stakedHBAR: string
  totalTasksCompleted: number
  reputationScore: string
}

type ProviderStatus = {
  running: boolean
  startedAt: number | null
  logs: string[]
}

type Activity = {
  walletBalanceHBAR: string
  pendingRewardsHBAR: string
  tasksDone: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [wallet, setWallet] = useState('')
  const [provider, setProvider] = useState<ProviderInfo | null>(null)
  const [status, setStatus] = useState<ProviderStatus>({ running: false, startedAt: null, logs: [] })
  const [activity, setActivity] = useState<Activity | null>(null)
  const [busy, setBusy] = useState(false)
  const [copiedDocker, setCopiedDocker] = useState(false)

  const toggleNode = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/provider/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: status.running ? 'stop' : 'start' })
      })
      const data = await res.json()
      if (res.ok) {
        setStatus(data)
      } else {
        alert(data.error || 'Failed to control node')
      }
    } catch (e) {
      console.error('Toggle error', e)
    } finally {
      setBusy(false)
    }
  }

  const DOCKER_COMMAND = 'docker run -d --name proofclaw-node -e PRIVATE_KEY=YOUR_KEY -e LLM=ollama proofclaw/node:latest'

  async function connectWallet() {
    const eth = (window as any).ethereum
    if (!eth) { alert('Install MetaMask'); return }
    const accs = await eth.request({ method: 'eth_requestAccounts' })
    if (accs[0]) setWallet(accs[0])
  }

  async function refreshData(currentWallet: string) {
    try {
      const [pRes, sRes, aRes] = await Promise.all([
        fetch(`/api/providers?wallet=${encodeURIComponent(currentWallet)}`),
        fetch('/api/provider/control'), // Local controller (might 404 on Vercel)
        fetch(`/api/provider/activity?wallet=${encodeURIComponent(currentWallet)}`)
      ])

      const pData = await pRes.json()
      if (pData.providers && pData.providers.length > 0) {
        setProvider(pData.providers[0])
      } else {
        router.push('/register')
        return
      }

      if (sRes.ok) setStatus(await sRes.json())
      if (aRes.ok) setActivity(await aRes.json())
    } catch (e) {
      console.error('Refresh error', e)
    }
  }

  useEffect(() => {
    const eth = (window as any).ethereum
    if (eth) {
      eth.request({ method: 'eth_accounts' }).then((accs: string[]) => {
        if (accs?.[0]) setWallet(accs[0])
      })
    }
  }, [])

  useEffect(() => {
    if (!wallet) return
    refreshData(wallet)
    const int = setInterval(() => refreshData(wallet), 5000)
    return () => clearInterval(int)
  }, [wallet])

  const copyDocker = () => {
    navigator.clipboard.writeText(DOCKER_COMMAND)
    setCopiedDocker(true)
    setTimeout(() => setCopiedDocker(false), 2000)
  }

  return (
    <div className="bg-[#0a0a0a] text-white min-h-screen selection:bg-[#E8201A] selection:text-white">
      <main className="pt-24 pb-12 px-6 max-w-[1440px] mx-auto">
        
        {/* Header Stats */}
        <header className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
           <div className="bg-[#111111] p-6 rounded-2xl border border-white/5 group hover:border-[#E8201A]/30 transition-all">
              <span className="font-mono text-[10px] text-zinc-500 uppercase block mb-2 tracking-widest">Network Status</span>
              <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                 <span className="font-black text-xl uppercase">Live</span>
              </div>
           </div>
           <div className="bg-[#111111] p-6 rounded-2xl border border-white/5">
              <span className="font-mono text-[10px] text-zinc-500 uppercase block mb-2 tracking-widest">Wallet Balance</span>
              <div className="flex items-baseline gap-2">
                 <span className="font-black text-2xl uppercase">{activity?.walletBalanceHBAR ?? '0.00'}</span>
                 <span className="text-[10px] text-zinc-500 underline font-mono">HBAR</span>
              </div>
           </div>
           <div className="bg-[#111111] p-6 rounded-2xl border border-white/5">
              <span className="font-mono text-[10px] text-zinc-500 uppercase block mb-2 tracking-widest">Reputation</span>
              <div className="flex items-baseline gap-1">
                 <span className="font-black text-2xl uppercase text-[#E8201A]">{provider?.reputationScore ?? '0.0'}</span>
                 <span className="text-[10px] text-zinc-600 font-mono">/ 100</span>
              </div>
           </div>
           <div className="bg-[#111111] p-6 rounded-2xl border border-white/5">
              <span className="font-mono text-[10px] text-zinc-500 uppercase block mb-2 tracking-widest">Rewards Generated</span>
              <div className="flex items-baseline gap-2">
                 <span className="font-black text-2xl uppercase">{activity?.pendingRewardsHBAR ?? '0.00'}</span>
                 <span className="text-[10px] text-zinc-500 font-mono">HBAR</span>
              </div>
           </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Console Area */}
          <div className="lg:col-span-8 space-y-8">
             
             {/* Zero-Install Provider Launchpad */}
             <section className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-white/5 rounded-3xl p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                   <Robot size={120} weight="fill" className="text-white" />
                </div>
                
                <div className="relative z-10">
                   <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-red-500/10 rounded-2xl">
                         <Cpu className="text-[#E8201A]" size={24} />
                      </div>
                      <div>
                         <h2 className="text-2xl font-black uppercase tracking-tighter">Become a Provider</h2>
                         <p className="font-mono text-[10px] text-zinc-500 uppercase">Run decentralized inference from your machine</p>
                      </div>
                   </div>

                   {/* Add Control Card here */}
                   <div className="mb-8 p-6 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                         <div className={`w-3 h-3 rounded-full ${status.running ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                         <div>
                            <p className="font-mono text-[10px] text-zinc-500 uppercase">Remote Node Status</p>
                            <p className="font-sans font-black text-sm uppercase">{status.running ? 'Running' : 'Offline'}</p>
                         </div>
                      </div>
                      <button 
                        onClick={toggleNode}
                        disabled={busy}
                        className={`px-8 py-3 rounded-xl font-sans font-black text-[10px] uppercase transition-all ${
                          status.running 
                            ? 'bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white' 
                            : 'bg-[#E8201A] text-white hover:scale-105 active:scale-95 shadow-lg shadow-red-500/20'
                        }`}
                      >
                         {busy ? 'Processing...' : status.running ? 'Stop Provider' : 'Start Provider'}
                      </button>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Docker Option */}
                      <div className="bg-black/40 p-6 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all group/opt">
                         <div className="flex items-center gap-2 mb-4">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span className="font-sans font-black text-[10px] uppercase">Option 1: Docker (No-Setup)</span>
                         </div>
                         <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed">The fastest way to join the network. Runs in a containerized environment with zero local tooling required.</p>
                         <div className="bg-black/60 p-3 rounded-xl border border-white/5 font-mono text-[9px] text-zinc-500 truncate mb-4 flex items-center justify-between">
                            <code>{DOCKER_COMMAND.slice(0, 30)}...</code>
                            <button onClick={copyDocker} className="text-[#E8201A] hover:text-white transition-colors">
                               {copiedDocker ? <CheckCircle size={14} /> : <Copy size={14} />}
                            </button>
                         </div>
                         <button onClick={copyDocker} className="w-full py-3 bg-blue-600/10 text-blue-400 border border-blue-500/20 rounded-xl font-sans font-black text-[10px] uppercase hover:bg-blue-600 hover:text-white transition-all">Copy Run Command</button>
                      </div>

                      {/* Binary Option */}
                      <div className="bg-black/40 p-6 rounded-2xl border border-white/5 hover:border-green-500/30 transition-all group/opt">
                         <div className="flex items-center gap-2 mb-4">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            <span className="font-sans font-black text-[10px] uppercase">Option 2: Standalone Binary</span>
                         </div>
                         <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed">Download a single executable. No Node.js or NPM needed. Just double-click and it will auto-generate your config.json.</p>
                         <div className="flex gap-2">
                            <a href="/downloads/proofclaw-node-macos" download className="flex-1 py-3 bg-zinc-800 rounded-xl font-mono text-[9px] flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all uppercase"><DownloadSimple /> macOS</a>
                            <a href="/downloads/proofclaw-node-win.exe" download className="flex-1 py-3 bg-zinc-800 rounded-xl font-mono text-[9px] flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all uppercase"><DownloadSimple /> Windows</a>
                            <a href="/downloads/proofclaw-node-linux" download className="flex-1 py-3 bg-zinc-800 rounded-xl font-mono text-[9px] flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all uppercase"><DownloadSimple /> Linux</a>
                         </div>
                      </div>
                   </div>
                </div>
             </section>

             {/* Activity Logs (Remote or Local) */}
             <section className="bg-[#111111] border border-white/5 rounded-3xl overflow-hidden flex flex-col h-[500px]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#151515]">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-zinc-700" />
                      <span className="font-mono text-[10px] text-zinc-500 uppercase">Provider_Logs_Terminal</span>
                   </div>
                   <div className="flex items-center gap-4">
                      <span className="font-mono text-[9px] text-zinc-600 uppercase">Active Agent: {wallet?.slice(0, 8)}...</span>
                   </div>
                </div>
                <div className="p-6 overflow-y-auto font-mono text-[11px] text-zinc-400 space-y-1 scrollbar-hide flex-1">
                   {status?.logs?.length > 0 ? (
                      status.logs.map((l, i) => <p key={i} className="hover:text-white transition-colors">{l}</p>)
                   ) : (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-800 gap-2 opacity-30 italic">
                         <Gear size={32} className="animate-spin" />
                         <p className="uppercase tracking-widest text-[9px] font-black">Awaiting Incoming Evidence...</p>
                      </div>
                   )}
                </div>
             </section>
          </div>

          {/* Sidebar Area */}
          <aside className="lg:col-span-4 space-y-6">
             {/* Account Info */}
             <div className="bg-[#111111] border border-white/5 p-6 rounded-3xl">
                <h3 className="font-sans font-black text-xs uppercase mb-4 tracking-widest text-[#E8201A]">Connected Operator</h3>
                <div className="bg-black/40 p-4 rounded-2xl border border-white/5 flex items-center gap-4 mb-4">
                   <div className="w-10 h-10 rounded-full bg-[#E8201A]/10 flex items-center justify-center text-[#E8201A]">
                      <Wallet size={20} />
                   </div>
                   <div className="overflow-hidden">
                      <p className="font-mono text-[10px] text-zinc-500 uppercase leading-none mb-1">EVM Address</p>
                      <p className="font-mono text-xs text-white truncate">{wallet || 'Not Connected'}</p>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                   <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                      <p className="font-mono text-[8px] text-zinc-600 uppercase mb-1">Jobs Finished</p>
                      <p className="font-sans font-black text-lg">{activity?.tasksDone ?? 0}</p>
                   </div>
                   <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                      <p className="font-mono text-[8px] text-zinc-600 uppercase mb-1">Uptime Score</p>
                      <p className="font-sans font-black text-lg text-green-500">99.8%</p>
                   </div>
                </div>
             </div>

             {/* Mining Optimization */}
             <div className="bg-gradient-to-br from-[#E8201A] to-red-900 rounded-3xl p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                   <Hexagon size={100} weight="fill" className="text-white" />
                </div>
                <h3 className="font-sans font-black text-xl text-white uppercase tracking-tighter mb-2 italic">Yield Maximization</h3>
                <p className="text-white/70 text-[10px] leading-relaxed mb-6">Increase your staked HBAR to climb the reputation ladder and receive more high-value inference tasks.</p>
                <button className="w-full py-3 bg-white text-black font-sans font-black text-[10px] uppercase rounded-xl hover:bg-zinc-200 transition-all shadow-xl">Increase Stake</button>
             </div>

             {/* Node Health Visualization */}
             <div className="bg-[#111111] border border-white/5 p-6 rounded-3xl">
                <h4 className="font-mono text-[9px] text-zinc-500 uppercase tracking-widest mb-6">Active Node Topology</h4>
                <div className="space-y-4">
                   {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            <span className="font-mono text-[10px] text-zinc-400">Node Cluster {i}</span>
                         </div>
                         <div className="w-24 h-1 bg-zinc-900 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500/50" style={{ width: `${80 + i * 5}%` }} />
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
