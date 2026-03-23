'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Cpu, Robot, DownloadSimple, Copy, CheckCircle, ArrowClockwise, ClockCounterClockwise, Globe } from '@phosphor-icons/react'
import { getApiUrl } from '@/lib/constants'

type ProviderInfo = {
  address: string
  isActive: boolean
  stakedHBAR: string
  totalTasksCompleted: number
  reputationScore: string
  proofTokensEarned: string
}

type Activity = {
  walletBalanceHBAR: string
  pendingRewardsHBAR: string
  tasksDone: number
}

// Persist node state across Next.js client-side route navigations
let cachedIsActive = false
let cachedLogs: string[] = []
let cachedTx: {hash: string, type: string, time: number}[] = []

export default function DashboardPage() {
  const router = useRouter()
  const [wallet, setWallet] = useState('')
  const [provider, setProvider] = useState<ProviderInfo | null>(null)
  const [activity, setActivity] = useState<Activity | null>(null)
  const [busy, setBusy] = useState(false)
  const [copiedDocker, setCopiedDocker] = useState(false)
  const [isElectron, setIsElectron] = useState(false)
  const [isNodeActive, setIsNodeActive] = useState(cachedIsActive)
  const [ollamaReady, setOllamaReady] = useState(false)
  const [miningLogs, setMiningLogs] = useState<string[]>(cachedLogs)
  const [transactions, setTransactions] = useState<{hash: string, type: string, time: number}[]>(cachedTx)

  useEffect(() => {
    const checkEnv = async () => {
      const isEl = typeof window !== 'undefined' && ((window as any).electron || navigator.userAgent.includes('Electron'))
      if (isEl) {
        setIsElectron(true)
        const ready = await (window as any).electron.checkOllama()
        setOllamaReady(ready)
        
        ;(window as any).electron.onLog((log: string) => {
          setMiningLogs(prev => {
            const next = [log, ...prev].slice(0, 100)
            cachedLogs = next
            return next
          })
          
          if (log.includes('TX_')) {
            const match = log.match(/TX_[A-Z]+[\]:\s]+([^\s\]]+)/)?.[1]
            if (match) {
              const type = log.includes('STAKE') ? 'STAKING' : log.includes('COMMIT') ? 'COMMIT' : 'REVEAL'
              setTransactions(prev => {
                if (prev.find(t => t.hash === match)) return prev
                const nextTx = [{ hash: match, type, time: Date.now() }, ...prev].slice(0, 10)
                cachedTx = nextTx
                return nextTx
              })
            }
          }
        })
      }
    }
    checkEnv()
  }, [])

  const toggleNode = async () => {
    if (!isElectron) return
    setBusy(true)
    if (isNodeActive) {
      await (window as any).electron.stopProvider()
      setIsNodeActive(false)
      cachedIsActive = false
    } else {
      if (!ollamaReady) {
        await (window as any).electron.startOllama()
        setOllamaReady(true)
      }
      const config = {
         walletAddress: wallet,
         tasksTopic: "0.0.8309839",
         llmProvider: "ollama",
         ollamaModel: "qwen3:4b"
      }
      await (window as any).electron.startProvider(config)
      setIsNodeActive(true)
      cachedIsActive = true
    }
    setBusy(false)
  }

  const DOCKER_COMMAND = 'docker run -d --name proofclaw-node -e PRIVATE_KEY=YOUR_KEY -e LLM=ollama proofclaw/node:latest'

  async function refreshData(currentWallet: string) {
    try {
      const [pRes, aRes] = await Promise.all([
        fetch(getApiUrl(`/api/providers?wallet=${encodeURIComponent(currentWallet)}`)),
        fetch(getApiUrl(`/api/provider/activity?wallet=${encodeURIComponent(currentWallet)}`))
      ])

      const pData = await pRes.json()
      const aData = await aRes.json()
      
      console.log('[DEBUG] pData', pData)
      console.log('[DEBUG] aData', aData)

      if (pData.providers && pData.providers.length > 0) {
        setProvider(pData.providers[0])
      } else {
        router.push('/register')
        return
      }

      setActivity(aData)
    } catch (e) {
      console.error('Refresh error', e)
    }
  }

  useEffect(() => {
    const initWallet = async () => {
      // 1. Try to load from internal Node Settings first (since Electron has no metamask)
      try {
        const res = await fetch(getApiUrl('/api/config/settings'))
        if (res.ok) {
          const data = await res.json()
          if (data.evmPrivateKey) {
            const { ethers } = await import('ethers')
            const nodeWallet = new ethers.Wallet(data.evmPrivateKey)
            setWallet(nodeWallet.address)
            return
          }
        }
      } catch (e) {
        console.warn('Could not fetch node settings for wallet', e)
      }

      // 2. Fallback to MetaMask if running in a regular browser
      const eth = (window as any).ethereum
      if (eth) {
        eth.request({ method: 'eth_accounts' }).then((accs: string[]) => {
          if (accs?.[0]) setWallet(accs[0])
        })
      }
    }
    
    initWallet()
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
      <main className="pt-24 pb-20 px-6 max-w-[1400px] mx-auto">
        
        {/* Simplified Header Stats */}
        <header className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
           <div className="bg-[#111111] p-8 rounded-3xl border border-white/5 group hover:border-[#E8201A]/30 transition-all flex flex-col justify-between h-32 relative">
              <div className="flex items-center justify-between">
                 <span className="font-mono text-[9px] text-zinc-500 uppercase block tracking-[0.2em] mb-auto">Node_Status</span>
                 <button 
                   onClick={() => wallet && refreshData(wallet)}
                   className="p-1 px-3 bg-zinc-800 rounded-full font-mono text-[8px] text-zinc-400 hover:text-white transition-colors flex items-center gap-1 group/btn"
                 >
                   <ArrowClockwise className="group-hover/btn:rotate-180 transition-transform duration-500" />
                   SYNK
                 </button>
              </div>
              <div className="flex items-center gap-3">
                 <div className={`w-2.5 h-2.5 rounded-full ${isNodeActive ? 'bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-zinc-800'}`} />
                 <span className="font-black text-2xl uppercase tracking-tighter">{isNodeActive ? 'Active' : 'Offline'}</span>
              </div>
           </div>
           <div className="bg-[#111111] p-8 rounded-3xl border border-white/5 flex flex-col justify-between h-32">
              <span className="font-mono text-[9px] text-zinc-500 uppercase block tracking-[0.2em] mb-auto">Provider_Reputation</span>
              <div className="flex items-baseline gap-2">
                 <span className="font-black text-3xl uppercase text-[#E8201A] leading-none">{provider?.reputationScore || '0.0'}</span>
                 <span className="text-[10px] text-zinc-600 font-mono uppercase font-bold tracking-widest">{provider ? 'Score' : 'NOT FOUND'}</span>
              </div>
           </div>
           <div className="bg-[#111111] p-8 rounded-3xl border border-white/5 flex flex-col justify-between h-32 scale-105 shadow-2xl shadow-red-500/5 border-red-500/10 relative group/stat">
              <span className="font-mono text-[9px] text-zinc-400 uppercase block tracking-[0.2em] mb-auto">Wallet_Balance</span>
              <div className="flex items-baseline gap-2">
                 <span className="font-black text-3xl uppercase text-white leading-none">
                   {(activity?.walletBalanceHBAR && Number(activity.walletBalanceHBAR) > 0) ? Number(activity.walletBalanceHBAR).toFixed(2) : '0.00'}
                 </span>
                 <span className="text-[10px] text-zinc-500 font-mono uppercase font-bold tracking-widest">HBAR</span>
              </div>
              {!activity && <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-3xl flex items-center justify-center opacity-0 group-hover/stat:opacity-100 transition-opacity"><span className="font-mono text-[8px] uppercase tracking-widest animate-pulse">Syncing...</span></div>}
           </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Control Console */}
          <div className="lg:col-span-8 space-y-8">
             
             <section className="bg-gradient-to-br from-[#111111] to-[#0a0a0a] border border-white/5 rounded-[40px] p-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                   <Robot size={180} weight="fill" className="text-white" />
                </div>
                
                <div className="relative z-10">
                   <div className="flex items-center gap-4 mb-10">
                      <div className="p-4 bg-red-500/10 rounded-3xl">
                         <Cpu className="text-[#E8201A]" size={32} />
                      </div>
                      <div>
                         <h2 className="text-3xl font-black uppercase tracking-tighter leading-none mb-2">
                            {isElectron ? 'Consensus Miner' : 'Join Network'}
                         </h2>
                         <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
                            {isElectron ? `Local ProofClaw Instance v1.0 • ${ollamaReady ? 'Ollama_Active' : 'Ollama_Ready'}` : 'Decentralized Intelligence Provisioning'}
                         </p>
                      </div>
                   </div>

                   {isElectron ? (
                      <div className="space-y-6">
                         <div className="flex items-center justify-between p-6 bg-black/40 rounded-3xl border border-white/5 backdrop-blur-xl">
                            <div className="flex items-center gap-5">
                               <div className={`w-4 h-4 rounded-full ${isNodeActive ? 'bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]' : 'bg-zinc-800'}`} />
                               <div>
                                  <p className="font-mono text-[10px] text-zinc-500 uppercase leading-none mb-2 tracking-widest">Instrumentation State</p>
                                  <p className="font-sans font-black text-sm uppercase tracking-tight">{isNodeActive ? 'Synthesizing Consensus' : 'Halted / Standby'}</p>
                                </div>
                            </div>
                            <button 
                               onClick={toggleNode}
                               disabled={busy}
                               className={`px-12 py-4 rounded-2xl font-sans font-black text-xs uppercase transition-all tracking-widest ${isNodeActive ? 'bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-600 hover:text-white' : 'bg-[#E8201A] text-white shadow-2xl hover:scale-105 active:scale-95'}`}
                            >
                               {busy ? 'SYNCHRONIZING...' : (isNodeActive ? 'STOP NODE' : 'START MINER')}
                            </button>
                         </div>

                         {/* Integrated Activity Log */}
                         <div className="h-64 bg-black/80 rounded-3xl border border-white/5 p-6 overflow-y-auto font-mono text-[10px] text-zinc-500 space-y-1.5 scrollbar-hide">
                            {miningLogs.length > 0 ? (
                               miningLogs.map((log, i) => <p key={i} className="animate-in slide-in-from-left duration-500 hover:text-white transition-colors cursor-default">{log}</p>)
                            ) : (
                               <div className="h-full flex items-center justify-center text-zinc-800 italic uppercase tracking-[0.3em] font-black text-[12px] opacity-20">
                                  No_Telemetry_Detected
                               </div>
                            )}
                         </div>
                      </div>
                   ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {/* Fallback Docker Option */}
                         <div className="bg-black/40 p-8 rounded-3xl border border-white/5 hover:border-blue-500/30 transition-all group/opt">
                            <div className="flex items-center gap-3 mb-6">
                               <span className="w-2 h-2 rounded-full bg-blue-500" />
                               <span className="font-sans font-black text-xs uppercase">Option 1: Docker</span>
                            </div>
                            <p className="text-[11px] text-zinc-500 mb-6 leading-relaxed uppercase font-mono italic">Zero-setup containerized environment for high-availability nodes.</p>
                            <div className="bg-black/60 p-4 rounded-xl border border-white/5 font-mono text-[10px] text-zinc-400 truncate mb-6 flex items-center justify-between">
                               <code>{DOCKER_COMMAND.slice(0, 30)}...</code>
                               <button onClick={copyDocker} className="text-[#E8201A] hover:text-white transition-colors">
                                  <Copy size={16} />
                                </button>
                            </div>
                            <button onClick={copyDocker} className="w-full py-4 bg-blue-600/10 text-blue-500 border border-blue-500/20 rounded-2xl font-sans font-black text-[10px] uppercase hover:bg-blue-600 hover:text-white transition-all">Copy Execution Packet</button>
                         </div>

                         <div className="bg-black/40 p-8 rounded-3xl border border-white/5 hover:border-green-500/30 transition-all group/opt">
                            <div className="flex items-center gap-3 mb-6">
                               <span className="w-2 h-2 rounded-full bg-green-500" />
                               <span className="font-sans font-black text-xs uppercase">Option 2: Binary</span>
                            </div>
                            <p className="text-[11px] text-zinc-500 mb-6 leading-relaxed uppercase font-mono italic">Native executable for direct hardware access and maximum throughput.</p>
                            <div className="flex gap-3">
                               <a href="#" className="flex-1 py-4 bg-zinc-900 rounded-2xl font-mono text-[10px] flex items-center justify-center gap-2 border border-white/5 hover:bg-zinc-800 transition-all uppercase leading-none">macOS</a>
                               <a href="#" className="flex-1 py-4 bg-zinc-900 rounded-2xl font-mono text-[10px] flex items-center justify-center gap-2 border border-white/5 hover:bg-zinc-800 transition-all uppercase leading-none">Windows</a>
                            </div>
                         </div>
                      </div>
                   )}
                </div>
             </section>
          </div>

          {/* New Recent Transactions Column */}
          <div className="lg:col-span-4 space-y-8">
             <section className="bg-[#111111] border border-white/5 rounded-[40px] p-8 min-h-[500px] flex flex-col">
                <header className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
                   <div className="flex items-center gap-3 text-[#E8201A]">
                      <ClockCounterClockwise size={18} weight="bold" />
                      <h3 className="font-sans font-black text-xs uppercase tracking-widest">Protocol Evidence</h3>
                   </div>
                   <Globe size={16} className="text-zinc-700 animate-pulse" />
                </header>

                <div className="flex-1 space-y-3">
                   {transactions.length > 0 ? (
                      transactions.map((tx) => (
                         <a 
                           key={tx.hash}
                           href={tx.hash.startsWith('0x') 
                             ? `https://hashscan.io/testnet/transaction/${tx.hash}`
                             : `https://hashscan.io/testnet/transaction/${tx.hash.replace('@', '-').replace(/\.(?=[^.]*$)/, '-')}`
                           }
                           target="_blank"
                           rel="noreferrer"
                           className="flex items-center justify-between p-4 bg-black/40 border border-white/5 rounded-2xl hover:border-[#E8201A]/30 hover:bg-black/60 transition-all group/tx"
                         >
                            <div className="flex items-center gap-4">
                               <div className={`w-2 h-2 rounded-full ${tx.type === 'STAKING' ? 'bg-blue-500' : tx.type === 'COMMIT' ? 'bg-purple-500' : 'bg-green-500'}`} />
                               <div>
                                  <p className="font-mono text-[10px] text-white uppercase font-black tracking-tight mb-1">{tx.type}</p>
                                  <p className="font-mono text-[7px] text-zinc-600 uppercase tracking-tighter truncate max-w-[120px]">{tx.hash}</p>
                               </div>
                            </div>
                            <div className="text-[9px] font-mono text-zinc-700 group-hover/tx:text-[#E8201A] transition-colors uppercase">
                               Scan →
                            </div>
                         </a>
                      ))
                   ) : (
                      <div className="flex-1 flex flex-col items-center justify-center space-y-4 opacity-10">
                         <div className="w-16 h-16 border-2 border-dashed border-white rounded-full flex items-center justify-center">
                            <ClockCounterClockwise size={24} />
                         </div>
                         <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-center px-4">Awaiting On-Chain Events</p>
                      </div>
                   )}
                </div>

                <footer className="mt-8 pt-6 border-t border-white/5">
                   <p className="font-mono text-[8px] text-zinc-600 uppercase tracking-widest leading-relaxed">Transactions are recorded on the Hedera Consensus Service and mirrored on HashScan for public verification.</p>
                </footer>
             </section>
          </div>

        </div>
      </main>
    </div>
  )
}
