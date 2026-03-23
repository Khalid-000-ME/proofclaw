'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowClockwise, Broadcast, Hexagon, CheckCircle, Cpu, Circle } from '@phosphor-icons/react'
import Link from 'next/link'
import { getApiUrl } from '@/lib/constants'

const HEDERA_TESTNET_CHAIN_ID = '0x128'
const DEFAULT_HCS_TOPIC_ID = '0.0.8309839'

const TASK_TYPES = [
  'CLASSIFICATION', 'EXTRACTION', 'SCORING', 'PREDICTION', 'VERIFICATION'
]

export default function RebroadcastPage() {
  const router = useRouter()
  const { taskId } = useParams() as { taskId: string }
  const [taskData, setTaskData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [broadcasting, setBroadcasting] = useState(false)
  const [error, setError] = useState('')
  const [providers, setProviders] = useState<any[]>([])
  const [loadingProviders, setLoadingProviders] = useState(false)
  const [allResults, setAllResults] = useState<any[]>([])
  const [broadcastSuccess, setBroadcastSuccess] = useState(false)
  const [approvedProviders, setApprovedProviders] = useState<string[]>([])
  const [isSettling, setIsSettling] = useState(false)
  const [settledTx, setSettledTx] = useState('')

  // Settlement logic
  async function approveAndSettle() {
    if (approvedProviders.length === 0) { alert('Select at least one provider to approve'); return }
    setIsSettling(true)
    try {
      const normalize = (addr: string) => addr.toLowerCase()
      const agreeingProviders = approvedProviders.map(normalize)
      const dissentingProviders = providers
        .filter(p => !approvedProviders.includes(p.address))
        .map(p => normalize(p.address))

      const res = await fetch(getApiUrl('/api/tasks/settle'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: taskId,
          agreeingProviders,
          dissentingProviders,
          totalReward: taskData.reward
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSettledTx(data.txHash)
      setTaskData((prev: any) => prev ? { ...prev, state: 'SETTLED' } : null)
      
      // Optimistically update reputation scores in the queue
      setProviders(prev => prev.map(p => {
        const isApproved = approvedProviders.includes(p.address)
        const currentScore = parseFloat(p.reputationScore) || 50
        // Award +5 for correct, Slash -5 for dissenting
        const updatedScore = isApproved 
          ? Math.min(100, currentScore + 5) 
          : Math.max(0, currentScore - 5)
        
        return {
          ...p,
          reputationScore: updatedScore.toFixed(1)
        }
      }))
    } catch (err: any) {
      alert(err?.message || 'Settlement failed')
    } finally {
      setIsSettling(false)
    }
  }

  function toggleProvider(addr: string) {
    setApprovedProviders(prev => 
      prev.includes(addr) ? prev.filter(a => a !== addr) : [...prev, addr]
    )
  }

  // Fetch task from contract via our API
  useEffect(() => {
    async function fetchTask() {
      try {
        const res = await fetch(getApiUrl(`/api/tasks?taskId=${taskId}`))
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to fetch task')
        setTaskData(data)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchTask()
  }, [taskId])

  // Poll for providers (copied from task/page.tsx logic)
  useEffect(() => {
    if (!taskId || !taskData) return
    let cancelled = false

    const poll = async () => {
      try {
        const provRes = await fetch(getApiUrl(`/api/tasks/providers?taskId=${encodeURIComponent(taskId)}`))
        if (!provRes.ok) return
        const provData = await provRes.json()
        const addresses: string[] = provData.providers || []
        
        const regRes = await fetch(getApiUrl(`/api/providers?wallet=${addresses.join(',')}`))
        const regData = await regRes.json()
        const knownProviders: Record<string, any> = {}
        for (const p of (regData.providers || [])) {
          knownProviders[p.address.toLowerCase()] = p
        }

        const queue = addresses.map((addr, idx) => {
          const reg = knownProviders[addr.toLowerCase()]
          return {
            address: addr,
            reputationScore: reg?.reputationScore ?? '—',
            stakedHBAR: reg?.stakedHBAR ?? '—',
            totalTasksCompleted: reg?.totalTasksCompleted ?? 0,
            isActive: reg?.isActive ?? true,
            claimedAt: Date.now() - (addresses.length - idx) * 1000
          }
        })
        if (!cancelled) setProviders(queue)
      } catch (e) {
        console.error('Provider poll error:', e)
      }
    }

    poll()
    const interval = setInterval(poll, 5000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [taskId, taskData])

  // Poll results
  useEffect(() => {
    if (!taskId) return
    let cancelled = false
    const fetchRes = async () => {
      try {
        const res = await fetch(getApiUrl(`/api/tasks/result?taskId=${encodeURIComponent(taskId)}`))
        const data = await res.json()
        if (!cancelled && res.ok && data.results) setAllResults(data.results)
      } catch {}
    }
    const interval = setInterval(fetchRes, 3000)
    fetchRes()
    return () => { cancelled = true; clearInterval(interval) }
  }, [taskId])

  async function reBroadcast() {
    setBroadcasting(true)
    setError('')
    try {
      const res = await fetch(getApiUrl('/api/tasks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: taskId,
          taskType: taskData?.taskType || 'CLASSIFICATION',
          inputHash: taskData?.inputHash || '0x',
          inputEndpoint: 'https://proofclaw.io/tasks/sample_input.json',
          topicId: taskData?.hcsTopic || DEFAULT_HCS_TOPIC_ID
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Broadcast failed')
      setBroadcastSuccess(true)
      setTimeout(() => setBroadcastSuccess(false), 5000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBroadcasting(false)
    }
  }

  const providersWithResults = useMemo(() => {
    return providers.map(p => {
      const res = allResults.find(r => r.providerId.toLowerCase() === p.address.toLowerCase())
      return { ...p, result: res?.result || null }
    })
  }, [providers, allResults])

  const settled = taskData?.state === 'SETTLED'

  if (loading) return (
     <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center font-mono text-xs uppercase tracking-widest text-zinc-500">
        <ArrowClockwise className="animate-spin mb-1" /> Analyzing Chain State...
     </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-red-500 selection:text-white">
      <div className="[background-image:radial-gradient(#1f1f1f_1px,transparent_1px)] [background-size:24px_24px] min-h-screen pt-32 pb-20 px-6">
        <div className="max-w-[1440px] mx-auto">
          <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-[#E8201A]" />
                <span className="font-mono text-[#E8201A] text-[10px] tracking-[0.2em] uppercase">Protocol Replay</span>
              </div>
              <h1 className="text-5xl font-black uppercase tracking-tighter">Event Reconstruction</h1>
            </div>
            <div className="flex items-center gap-4">
               <div className="bg-[#111111] p-4 border-l-2 border-[#E8201A]">
                 <p className="font-mono text-[9px] text-zinc-500 uppercase mb-1">State Root</p>
                 <p className="font-mono text-sm font-bold text-white break-all max-w-[200px] leading-none">{taskId.slice(0, 16)}...</p>
               </div>
               <button 
                onClick={reBroadcast}
                disabled={broadcasting || settled}
                className={`flex items-center gap-3 px-8 py-4 rounded-full font-black uppercase text-xs tracking-widest transition-all ${broadcastSuccess ? 'bg-green-600' : 'bg-[#E8201A] hover:bg-red-600'} disabled:opacity-40 shadow-[0_0_30px_rgba(232,32,26,0.2)]`}
               >
                 {broadcasting ? <ArrowClockwise className="animate-spin" /> : broadcastSuccess ? 'BROADCAST_OK' : (
                   <><Broadcast weight="bold" /> Re-Broadcast To HCS</>
                 )}
               </button>
            </div>
          </header>

          <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <section className="lg:col-span-7 space-y-8">
              <div className="bg-[#111111] border border-white/5 p-8 rounded-3xl">
                <h3 className="font-sans text-lg font-bold uppercase mb-6 text-zinc-300">Consensus Results</h3>
                <div className="bg-black/50 p-8 rounded-2xl min-h-[150px] border border-white/5 flex flex-col items-center justify-center relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-4">
                      <span className="font-mono text-[8px] text-[#E8201A] border border-[#E8201A]/30 px-2 py-0.5 rounded uppercase">{allResults.length} Node Responses Received</span>
                   </div>
                  <p className="font-mono text-zinc-400 leading-relaxed text-sm text-center">
                    {allResults.length > 0 
                      ? `Captured ${allResults.length} independent inferences for this protocol ID. Check individual node signatures in the queue.`
                      : 'Waiting for node revelation packets...'}
                  </p>
                </div>

                {!settled && allResults.length > 0 && (
                  <div className="mt-8 pt-8 border-t border-white/5">
                    <button 
                      onClick={approveAndSettle}
                      disabled={isSettling || approvedProviders.length === 0}
                      className="w-full py-6 rounded-2xl bg-green-600 hover:bg-green-500 disabled:bg-zinc-800 disabled:opacity-50 text-white font-sans font-black uppercase tracking-widest text-sm transition-all shadow-[0_0_40px_rgba(22,163,74,0.2)] hover:shadow-[0_0_50px_rgba(22,163,74,0.4)] flex items-center justify-center gap-3 active:scale-[0.98]"
                    >
                      {isSettling ? (
                         <>
                           <ArrowClockwise className="animate-spin" />
                           FINALIZING_PROTOCOL_SETTLEMENT...
                         </>
                      ) : (
                        <>
                           APPROVE SELECTED & FINALIZE
                           <span className="material-symbols-outlined uppercase">check_circle</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {settled && (
                   <div className="mt-8 space-y-4">
                      <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center gap-3 font-bold text-green-500 font-mono text-xs uppercase shadow-[0_0_20px_rgba(34,197,94,0.1)]">
                         <CheckCircle size={20} />
                         Protocol Settled Successfully
                      </div>
                      {settledTx && (
                         <div className="p-5 bg-black/40 rounded-xl border border-white/5 flex flex-col items-center gap-2 group transition-all hover:bg-black/60">
                            <span className="font-mono text-[8px] text-zinc-500 uppercase flex items-center gap-1 italic">
                               <Circle size={10} /> Settlement Transaction (Hex Trace)
                            </span>
                            <a 
                              href={`https://hashscan.io/testnet/transaction/${settledTx}`} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="font-mono text-[10px] text-zinc-400 break-all text-center underline group-hover:text-[#E8201A] transition-colors"
                            >
                               {settledTx}
                            </a>
                         </div>
                      )}
                   </div>
                )}
              </div>

              {error && (
                <div className="p-6 bg-red-900/20 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-400 font-mono text-xs uppercase">
                   <Circle size={16} /> Error: {error}
                </div>
              )}
            </section>

            <section className="lg:col-span-5 space-y-8">
              <div className="bg-[#111111] border border-white/5 rounded-3xl p-8 sticky top-32">
                <h3 className="font-sans text-lg font-bold uppercase mb-4 text-zinc-300">Node Population</h3>
                <div className="space-y-4">
                  {providersWithResults.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-zinc-800 gap-3">
                       <Cpu size={32} className="opacity-10 animate-pulse" />
                       <p className="text-[10px] uppercase font-mono tracking-widest italic">Awaiting Active Clusters...</p>
                    </div>
                  ) : (
                    providersWithResults.map((p, i) => (
                      <div key={p.address} className={`flex flex-col p-5 rounded-2xl border transition-all ${approvedProviders.includes(p.address) ? 'bg-green-500/5 border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : 'bg-black/20 border-white/5 hover:border-white/10'}`}>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex flex-col">
                             <span className="font-mono text-[10px] text-zinc-500 tracking-tighter">{p.address.slice(0, 16)}...</span>
                             <div className="flex items-center gap-2 mt-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                <span className="font-sans font-black text-[10px] uppercase">Node #{i + 1}</span>
                             </div>
                          </div>
                          {!settled && (
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={approvedProviders.includes(p.address)}
                                onChange={() => toggleProvider(p.address)}
                              />
                              <div className="w-11 h-6 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-green-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all shadow-inner transition-all"></div>
                            </label>
                          )}
                        </div>

                        {p.result ? (
                          <Link href={`/task/${taskId}/result/${p.address}`} className="group/msg relative bg-black/40 p-4 rounded-xl border border-white/5 hover:bg-black/80 transition-all cursor-pointer overflow-hidden block">
                             <div className="absolute top-0 right-0 p-2 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                                <span className="font-mono text-[8px] text-zinc-600 border border-white/5 px-2 py-0.5 rounded uppercase">Full Record →</span>
                             </div>
                             <p className="font-mono text-[11px] text-zinc-300 leading-relaxed line-clamp-4 group-hover/msg:text-white transition-colors">
                               {p.result}
                             </p>
                          </Link>
                        ) : (
                          <div className="py-8 border border-dashed border-white/5 rounded-xl flex items-center justify-center font-mono text-[9px] text-zinc-700 italic">
                             REVEAL_SEQUENCE_PENDING...
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}
