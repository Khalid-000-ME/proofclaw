'use client'

import { useState, useEffect, useMemo } from 'react'
import { ethers } from 'ethers'
import { ArrowClockwise, CheckCircle, Circle, Cpu } from '@phosphor-icons/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_HCS_TOPIC_ID = '0.0.8309839'
const HEDERA_TESTNET_CHAIN_ID = '0x128'
const HEDERA_RPC_URLS = ['https://testnet.hashio.io/api']
const HEDERA_GAS_PRICE = ethers.parseUnits('1200', 'gwei')

const TASK_TYPES = [
  'CLASSIFICATION',
  'EXTRACTION',
  'SCORING',
  'PREDICTION',
  'VERIFICATION'
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
  taskId: string
  requester: string
  taskType: number
  rewardHBAR: string
  stakeRequiredHBAR: string
  minProviders: number
  deadline: number
  createdAt: number
  state: number
}

interface ProviderInQueue {
  address: string
  reputationScore: string
  stakedHBAR: string
  totalTasksCompleted: number
  isActive: boolean
  claimedAt?: number
}

type SortPattern = 'fcfs' | 'reputation'

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TaskPage() {
  const router = useRouter()
  const [walletAddress, setWalletAddress] = useState('')
  const [taskRegistryAddress, setTaskRegistryAddress] = useState('')
  const [taskEscrowAddress, setTaskEscrowAddress] = useState('')
  const [hcsTopicId, setHcsTopicId] = useState(DEFAULT_HCS_TOPIC_ID)
  const [connecting, setConnecting] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [txHash, setTxHash] = useState('')
  const [activeTaskId, setActiveTaskId] = useState('')
  const [taskData, setTaskData] = useState<Task | null>(null)
  const [providers, setProviders] = useState<ProviderInQueue[]>([])
  const [loadingProviders, setLoadingProviders] = useState(false)
  const [allResults, setAllResults] = useState<any[]>([])

  const [sortPattern, setSortPattern] = useState<SortPattern>('fcfs')
  const [approvedProviders, setApprovedProviders] = useState<string[]>([])
  const [isSettling, setIsSettling] = useState(false)
  const [settledTx, setSettledTx] = useState('')

  // Form State
  const [reward, setReward] = useState('2')
  const [taskType, setTaskType] = useState(0)
  const [minProviders, setMinProviders] = useState('1')
  // Default deadline: 20 minutes from now
  const [deadlineDate, setDeadlineDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10))
  const [deadlineHour, setDeadlineHour] = useState('12')
  const [inputData, setInputData] = useState('Classify this news article: "Hedera reaches 50B transactions..."')

  const TASK_ESCROW_ABI = [
    {
      "anonymous": false,
      "inputs": [
        { "indexed": true, "internalType": "bytes32", "name": "taskId", "type": "bytes32" },
        { "indexed": true, "internalType": "address", "name": "requester", "type": "address" },
        { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
      ],
      "name": "PaymentDeposited",
      "type": "event"
    },
    {
      "inputs": [
        { "internalType": "bytes32", "name": "_taskId", "type": "bytes32" },
        { "internalType": "enum TaskRegistry.TaskType", "name": "_taskType", "type": "uint8" },
        { "internalType": "bytes32", "name": "_inputHash", "type": "bytes32" },
        { "internalType": "uint256", "name": "_stakeRequired", "type": "uint256" },
        { "internalType": "uint256", "name": "_minProviders", "type": "uint256" },
        { "internalType": "uint256", "name": "_deadline", "type": "uint256" },
        { "internalType": "bytes32", "name": "_hcsTaskTopic", "type": "bytes32" }
      ],
      "name": "depositPayment",
      "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }],
      "stateMutability": "payable",
      "type": "function"
    }
  ]

  // ── Connect wallet ──
  async function connectWallet() {
    const eth = (window as any).ethereum
    if (!eth) { alert('Install MetaMask'); return }
    setConnecting(true)
    try {
      const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' })
      if (accounts[0]) setWalletAddress(accounts[0])
    } catch (err: any) {
      console.error('Wallet connection failed:', err)
    } finally { 
      setConnecting(false) 
    }
  }

  useEffect(() => {
    fetch('/api/config/contracts')
      .then((r) => r.json())
      .then((cfg) => {
        setTaskRegistryAddress(cfg.taskRegistry || '')
        setTaskEscrowAddress(cfg.taskEscrow || '')
        setHcsTopicId(cfg.tasksTopic || DEFAULT_HCS_TOPIC_ID)
      })
      .catch(() => {})
  }, [])

  async function createTask() {
    if (!walletAddress) { await connectWallet(); return }
    setIsCreating(true)
    try {
      const ethProvider = new ethers.BrowserProvider((window as any).ethereum)
      const signer = await ethProvider.getSigner()
      const escrow = new ethers.Contract(taskEscrowAddress, TASK_ESCROW_ABI, signer)
      const inputHash = ethers.keccak256(ethers.toUtf8Bytes(inputData))
      const simulatedId = ethers.ZeroHash
      const topicBytes = ethers.zeroPadBytes(ethers.toUtf8Bytes(hcsTopicId), 32)
      const rewardForContract = ethers.parseUnits(reward, 8)
      const rewardForDisplay = rewardForContract * BigInt(10**10) // 18 decimals for MM display
      const stakeForContract = ethers.parseUnits('1', 8)
      
      // USER_REQUEST: Use 20 minutes default if no explicit expiration is provided or as default state
      // For now, I'll calculate it based on 20 mins from NOW if the default creation flow is used
      const deadline = BigInt(Math.floor((Date.now() + 20 * 60 * 1000) / 1000))

      const tx = await escrow.depositPayment(simulatedId, taskType, inputHash, stakeForContract, BigInt(minProviders), deadline, topicBytes, {
        value: rewardForDisplay,
        gasLimit: 600000,
        gasPrice: HEDERA_GAS_PRICE
      })
      setTxHash(tx.hash)
      const receipt = await tx.wait()
      let actualTaskId = simulatedId
      if (receipt?.logs) {
        for (const log of receipt.logs) {
          try {
            const parsed = escrow.interface.parseLog(log)
            if (parsed?.name === 'PaymentDeposited') { actualTaskId = parsed.args[0]; break }
          } catch {}
        }
      }
      
      setActiveTaskId(actualTaskId)
      setTaskData({
        taskId: actualTaskId,
        requester: walletAddress,
        taskType: taskType,
        rewardHBAR: reward,
        stakeRequiredHBAR: '1',
        minProviders: parseInt(minProviders),
        deadline: Number(deadline),
        createdAt: Date.now() / 1000,
        state: 0
      })

      await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: actualTaskId,
          taskType: TASK_TYPES[taskType],
          inputHash,
          inputEndpoint: 'https://proofclaw.io/tasks/sample_input.json',
          topicId: hcsTopicId
        })
      })
    } catch (err: any) {
      console.error(err)
      alert('Transaction failed: ' + (err.message || 'Unknown error'))
    } finally {
      setIsCreating(false)
    }
  }

  useEffect(() => {
    if (!activeTaskId) return
    let cancelled = false
    const poll = async () => {
      try {
        const provRes = await fetch(`/api/tasks/providers?taskId=${encodeURIComponent(activeTaskId)}`)
        const provData = await provRes.json()
        const addresses: string[] = provData.providers || []
        if (addresses.length === 0) return
        
        const regRes = await fetch(`/api/providers?wallet=${addresses.join(',')}`)
        const regData = await regRes.json()
        const known: any = {}
        for (const p of (regData.providers || [])) known[p.address.toLowerCase()] = p

        const queue = addresses.map((addr, i) => ({
          address: addr,
          reputationScore: known[addr.toLowerCase()]?.reputationScore ?? '—',
          stakedHBAR: known[addr.toLowerCase()]?.stakedHBAR ?? '—',
          totalTasksCompleted: known[addr.toLowerCase()]?.totalTasksCompleted ?? 0,
          isActive: true,
          claimedAt: Date.now() - (addresses.length - i) * 1000
        }))
        if (!cancelled) setProviders(queue)
      } catch {}
    }
    const interval = setInterval(poll, 5000)
    poll()
    return () => { cancelled = true; clearInterval(interval) }
  }, [activeTaskId])

  useEffect(() => {
    if (!activeTaskId) return
    let cancelled = false
    const fetchRes = async () => {
      try {
        const res = await fetch(`/api/tasks/result?taskId=${encodeURIComponent(activeTaskId)}`)
        const data = await res.json()
        if (!cancelled && res.ok && data.results) setAllResults(data.results)
      } catch {}
    }
    const interval = setInterval(fetchRes, 3000)
    fetchRes()
    return () => { cancelled = true; clearInterval(interval) }
  }, [activeTaskId])

  const providersWithResults = useMemo(() => {
    return providers.map(p => {
      const res = allResults.find(r => r.providerId.toLowerCase() === p.address.toLowerCase())
      return { ...p, result: res?.result || null }
    })
  }, [providers, allResults])

  const settled = taskData?.state === 3

  async function approveAndSettle() {
    setIsSettling(true)
    try {
      const norm = (a: string) => ethers.getAddress(a.toLowerCase())
      const res = await fetch('/api/tasks/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskId: activeTaskId,
          agreeingProviders: approvedProviders.map(norm),
          dissentingProviders: providers.filter(p => !approvedProviders.includes(p.address)).map(p => norm(p.address)),
          totalReward: reward
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSettledTx(data.txHash)
      setTaskData(prev => prev ? { ...prev, state: 3 } : null)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsSettling(false)
    }
  }

  const [nowTick, setNowTick] = useState(Date.now())
  useEffect(() => {
    // Stop timer if settled
    if (settled) return
    const t = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(t)
  }, [settled])

  const timeLeftStr = useMemo(() => {
    if (!taskData?.deadline) return '—'
    if (settled) return 'CLOSED'
    const ms = taskData.deadline * 1000 - nowTick
    if (ms <= 0) return 'EXPIRED'
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }, [taskData, nowTick, settled])

  return (
    <div className="min-h-screen text-white bg-[#0a0a0a] [background-image:radial-gradient(#1f1f1f_1px,transparent_1px)] [background-size:24px_24px]">
      <main className="pt-32 pb-20 px-6 max-w-[1440px] mx-auto min-h-screen">
        <header className="mb-12 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-[#E8201A]" />
              <span className="font-mono text-[#E8201A] text-[10px] tracking-widest uppercase">{activeTaskId ? 'Active Protocol' : 'Setup Stage'}</span>
            </div>
            <h1 className="text-5xl font-bold uppercase tracking-tighter">{activeTaskId ? 'Monitoring' : 'Create Task'}</h1>
          </div>
          <div className="bg-[#111111] p-4 border-l-2 border-[#E8201A]">
            <p className="font-mono text-[10px] text-zinc-500 uppercase mb-1">Topic</p>
            <p className="font-mono text-lg font-bold">{hcsTopicId}</p>
          </div>
        </header>

        <div className={activeTaskId ? "grid grid-cols-1 lg:grid-cols-12 gap-8" : "flex justify-center"}>
          <section className={activeTaskId ? "lg:col-span-7" : "w-full max-w-2xl"}>
            {!activeTaskId ? (
              <div className="bg-[#111111] p-8 border border-white/5 rounded-3xl space-y-8">
                 <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="font-mono text-[10px] text-zinc-500 uppercase block mb-2">Reward (HBAR)</label>
                      <input type="number" value={reward} onChange={e => setReward(e.target.value)} className="w-full bg-black/50 border border-white/10 p-4 rounded-xl font-mono text-sm focus:border-red-500 outline-none" />
                    </div>
                    <div>
                      <label className="font-mono text-[10px] text-zinc-500 uppercase block mb-2">Min Providers</label>
                      <input type="number" value={minProviders} onChange={e => setMinProviders(e.target.value)} className="w-full bg-black/50 border border-white/10 p-4 rounded-xl font-mono text-sm focus:border-red-500 outline-none" />
                    </div>
                 </div>
                 <div>
                    <label className="font-mono text-[10px] text-zinc-500 uppercase block mb-2">Instructions</label>
                    <textarea value={inputData} onChange={e => setInputData(e.target.value)} rows={5} className="w-full bg-black/50 border border-white/10 p-4 rounded-xl font-sans text-sm focus:border-red-500 outline-none resize-none" />
                 </div>
                 <div className="bg-black/40 p-5 rounded-2xl border border-dashed border-white/10 flex items-center justify-between font-mono text-[10px]">
                    <span className="text-zinc-500 uppercase italic">Default TTL Sequence</span>
                    <span className="text-[#E8201A] font-bold">20m FIXED</span>
                 </div>
                 <button onClick={createTask} disabled={isCreating} className="w-full py-5 bg-[#E8201A] hover:bg-red-600 rounded-2xl font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-[0_0_30px_rgba(232,32,26,0.2)]">
                    {isCreating ? <ArrowClockwise className="animate-spin" /> : 'Broadcast Protocol'}
                 </button>
              </div>
            ) : (
              <div className="space-y-6">
                 <div className="bg-[#111111] border border-white/5 p-8 rounded-3xl">
                    <h3 className="font-sans text-lg font-bold uppercase mb-6 text-zinc-400">Consensus Results</h3>
                    <div className="bg-black/50 p-8 rounded-2xl min-h-[120px] border border-white/5 flex flex-col items-center justify-center italic text-zinc-500 text-center font-mono text-sm">
                       {allResults.length > 0 ? `Captured ${allResults.length} independent inferences. Check the queue below for results.` : 'Waiting for provider reveals...'}
                    </div>

                    {!settled && allResults.length > 0 && (
                      <button onClick={approveAndSettle} disabled={isSettling || approvedProviders.length === 0} className="w-full mt-8 py-6 bg-green-600 hover:bg-green-500 rounded-2xl font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                        {isSettling ? (
                           <>
                             <ArrowClockwise className="animate-spin" />
                             FINALIZING_SETTLEMENT...
                           </>
                        ) : (
                          <>
                             SETTLE SELECTED Provider PAYOUTS
                             <span className="material-symbols-outlined uppercase">payments</span>
                          </>
                        )}
                      </button>
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
                                   <Circle size={10} /> Evolution Trace (Tx Hash)
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
                 <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-[#111111] rounded-2xl border border-white/5">
                       <p className="font-mono text-[9px] text-zinc-500 uppercase mb-2">Protocol ID Root</p>
                       <p className="font-mono text-[11px] text-zinc-300 break-all">{activeTaskId.slice(0, 32)}...</p>
                    </div>
                    <div className="p-6 bg-[#111111] rounded-2xl border border-white/5">
                       <p className="font-mono text-[9px] text-zinc-500 uppercase mb-2">Time Remaining</p>
                       <p className={`font-mono text-xl font-bold ${settled ? 'text-zinc-600' : 'text-white'}`}>{timeLeftStr}</p>
                    </div>
                 </div>
              </div>
            )}
          </section>

          {activeTaskId && (
            <aside className="lg:col-span-5">
              <div className="bg-[#111111] border border-white/5 p-8 rounded-3xl sticky top-32">
                <h3 className="font-sans text-lg font-bold uppercase mb-6 text-zinc-400">Provider Queue</h3>
                <div className="space-y-4">
                   {providersWithResults.length === 0 ? (
                     <div className="py-20 text-center font-mono text-[10px] text-zinc-700 uppercase italic tracking-widest flex flex-col items-center gap-3">
                        <Cpu size={32} className="opacity-10 animate-pulse" />
                        Polling HCS for Providers...
                     </div>
                   ) : (
                     providersWithResults.map((p, i) => (
                       <div key={p.address} className={`flex flex-col p-5 rounded-2xl border transition-all ${approvedProviders.includes(p.address) ? 'bg-green-500/5 border-green-500/50 shadow-[0_0_20px_rgba(22,163,74,0.1)]' : 'bg-black/20 border-white/5 hover:border-white/10'}`}>
                          <div className="flex items-center justify-between mb-4">
                             <div className="flex flex-col">
                                <span className="font-mono text-[10px] text-zinc-500">{p.address.slice(0, 16)}...</span>
                                <div className="flex items-center gap-2 mt-1">
                                   <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                   <span className="font-sans font-black text-[10px] uppercase">Provider #{i+1}</span>
                                </div>
                             </div>
                             {!settled && (
                               <input type="checkbox" checked={approvedProviders.includes(p.address)} onChange={() => setApprovedProviders(prev => prev.includes(p.address) ? prev.filter(a => a !== p.address) : [...prev, p.address])} className="w-5 h-5 accent-red-600 cursor-pointer" />
                             )}
                          </div>
                          {p.result ? (
                            <Link href={`/task/${activeTaskId}/result/${p.address}`} className="bg-black/50 p-4 rounded-xl border border-white/5 group/msg cursor-pointer hover:bg-black/80 transition-all relative overflow-hidden">
                               <div className="absolute top-0 right-0 p-2 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                                  <span className="font-mono text-[8px] text-zinc-600 uppercase border border-white/5 px-2 py-0.5 rounded">View Info →</span>
                               </div>
                               <p className="font-mono text-[11px] text-zinc-300 leading-relaxed line-clamp-4 group-hover/msg:text-white transition-colors">{p.result}</p>
                            </Link>
                          ) : (
                            <div className="h-20 flex items-center justify-center font-mono text-[9px] text-zinc-700 italic border border-dashed border-white/5 rounded-xl">Revelation Pending...</div>
                          )}
                       </div>
                     ))
                   )}
                </div>
              </div>
            </aside>
          )}
        </div>
      </main>
    </div>
  )
}
