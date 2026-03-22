'use client'

import { useState, useEffect, useCallback } from 'react'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { Plus, ArrowClockwise, Cpu, Hexagon, Timer } from '@phosphor-icons/react'
import Link from 'next/link'

interface Task {
  taskId: string
  requester: string
  taskType: string
  reward: string
  stakeRequired: string
  minProviders: number
  deadline: number
  createdAt: number
  state: string
  providerCount: number
}

function timeAgo(ts: number) {
  if (!ts) return '—'
  const diff = Date.now() / 1000 - ts
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function MarketPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/tasks')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTasks(data.tasks || [])
      setLastRefresh(new Date())
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return (
    <div className="min-h-screen bg-bg">
      <main className="pt-24 p-6 lg:p-10 max-w-screen-xl mx-auto mt-[100px]">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="font-mono text-[24px] font-bold text-text-1">
                TASK MARKET
              </h1>
              <p className="text-xs text-text-3 font-mono mt-1 uppercase tracking-widest">
                Real-time on-chain tasks from TaskRegistry
              </p>
            </div>
            <div className="flex items-center gap-3">
              {lastRefresh && (
                <span className="text-[10px] text-text-3 font-mono">
                  REFRESHED {lastRefresh.toLocaleTimeString()}
                </span>
              )}
              <button 
                onClick={fetchTasks}
                disabled={loading}
                className="p-2.5 bg-bg-2 border border-border rounded-xl hover:border-text-3 transition-all disabled:opacity-40"
              >
                <ArrowClockwise className={`w-4 h-4 text-text-2 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <Link href="/task">
                <button className="flex items-center gap-2 bg-brand-red-dim border border-brand-red text-brand-red px-5 py-2.5 rounded-xl font-mono text-xs font-bold hover:bg-brand-red/20 transition-all active:scale-95 shadow-lg shadow-brand-red/10">
                  <Plus className="w-4 h-4" />
                  POST NEW TASK
                </button>
              </Link>
            </div>
          </div>

          {error && (
            <div className="bg-semantic-slashed-dim border border-semantic-slashed text-semantic-slashed px-4 py-3 rounded-xl mb-6 text-sm font-mono flex items-center gap-2">
              <span className="w-2 h-2 bg-semantic-slashed rounded-full animate-pulse" />
              {error}
            </div>
          )}
          
          <div className="bg-bg-2 border border-border rounded-2xl overflow-hidden shadow-xl shadow-black/20">
            {loading ? (
              <div className="py-32 flex flex-col items-center justify-center text-text-3 gap-4">
                <div className="w-8 h-8 border-2 border-brand-red border-t-transparent rounded-full animate-spin" />
                <p className="font-mono text-xs uppercase tracking-widest">Hydrating from RPC...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="py-32 flex flex-col items-center justify-center text-text-3 gap-4">
                <Cpu className="w-12 h-12 opacity-20" />
                <p className="font-mono text-sm uppercase tracking-widest text-text-2">No active tasks found</p>
                <Link href="/task">
                  <button className="mt-2 text-brand-red underline text-xs font-mono">Be the first to post a task</button>
                </Link>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-bg-3/50">
                    <th className="text-left font-sans text-[10px] uppercase tracking-[0.2em] text-text-3 py-5 px-6">Task ID / Type</th>
                    <th className="text-left font-sans text-[10px] uppercase tracking-[0.2em] text-text-3 py-5 px-6">Reward</th>
                    <th className="text-center font-sans text-[10px] uppercase tracking-[0.2em] text-text-3 py-5 px-6">Status</th>
                    <th className="text-right font-sans text-[10px] uppercase tracking-[0.2em] text-text-3 py-5 px-6">Providers</th>
                    <th className="text-right font-sans text-[10px] uppercase tracking-[0.2em] text-text-3 py-5 px-6">Posted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {tasks.map((task) => (
                    <tr 
                      key={task.taskId} 
                      onClick={() => window.location.href = `/task/${task.taskId}`}
                      className="group border-b border-border/50 hover:bg-bg-3/40 transition-all cursor-pointer relative"
                    >
                      <td className="py-5 px-6">
                        <div className="flex flex-col">
                          <span className="font-mono text-[13px] text-text-1 font-bold tracking-tight group-hover:text-brand-red transition-colors">
                            {task.taskId.slice(0, 12)}...
                          </span>
                          <span className="text-[10px] text-text-3 font-mono mt-1 uppercase tracking-widest">{task.taskType}</span>
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex items-center gap-2 text-brand-red">
                          <Hexagon className="w-3.5 h-3.5" weight="fill" />
                          <span className="font-mono text-sm font-bold">{task.reward} HBAR</span>
                        </div>
                      </td>
                      <td className="py-5 px-6">
                        <div className="flex justify-center">
                          <StatusBadge state={task.state as any} />
                        </div>
                      </td>
                      <td className="py-5 px-6 text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-mono text-[13px] text-text-1 font-bold">{task.providerCount} / {task.minProviders}</span>
                          <div className="w-16 h-1 bg-bg-3 rounded-full overflow-hidden mt-1.5 border border-border/50">
                            <div 
                              className={`h-full bg-brand-red transition-all duration-500`}
                              style={{ width: `${Math.min(100, (task.providerCount / task.minProviders) * 100)}%` }}
                             />
                          </div>
                        </div>
                      </td>
                      <td className="py-5 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5 text-text-3">
                          <Timer className="w-3.5 h-3.5" />
                          <span className="font-mono text-[11px] font-bold whitespace-nowrap">
                            {timeAgo(task.createdAt)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
      </main>
    </div>
  )
}
