'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Clipboard, Hexagon, Circle, Cpu } from '@phosphor-icons/react'
import Link from 'next/link'
import { getApiUrl } from '@/lib/constants'

export default function ResultDetailPage() {
  const { taskId, providerId } = useParams() as { taskId: string; providerId: string }
  const router = useRouter()
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function fetchResult() {
      try {
        const res = await fetch(getApiUrl(`/api/tasks/result?taskId=${taskId}`))
        const data = await res.json()
        if (data.results) {
          const found = data.results.find((r: any) => r.providerId.toLowerCase() === providerId.toLowerCase())
          setResult(found)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchResult()
  }, [taskId, providerId])

  function handleCopy() {
    if (result?.result) {
      navigator.clipboard.writeText(result.result)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
       <div className="flex flex-col items-center gap-4">
          <Hexagon className="w-12 h-12 text-[#E8201A] animate-pulse" weight="fill" />
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">Retrieving Packet...</p>
       </div>
    </div>
  )

  if (!result) return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-6">
       <p className="font-mono text-zinc-600 uppercase tracking-widest">No detailed record found for this node.</p>
       <button onClick={() => router.back()} className="px-6 py-2 border border-white/10 rounded-full font-mono text-[10px] text-white hover:bg-white/5 uppercase transition-all">← Back to Stream</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-red-500 selection:text-white">
      <div className="[background-image:radial-gradient(#1f1f1f_1px,transparent_1px)] [background-size:24px_24px] min-h-screen pt-32 pb-20 px-6">
        <div className="max-w-[1000px] mx-auto">
           <header className="mb-12">
              <Link href={`/task/${taskId}`} className="inline-flex items-center gap-2 text-zinc-500 hover:text-white mb-8 transition-colors group">
                 <ArrowLeft className="group-hover:-translate-x-1 transition-transform" />
                 <span className="font-mono text-xs uppercase tracking-widest">Return to Task Stream</span>
              </Link>
              <div className="flex items-end justify-between border-b border-white/5 pb-8">
                 <div>
                    <div className="flex items-center gap-2 mb-2 text-[#E8201A]">
                       <Cpu size={16} />
                       <span className="font-mono text-[10px] uppercase tracking-[0.3em]">Payload Trace</span>
                    </div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter">Inference Report</h1>
                 </div>
                 <div className="text-right">
                    <p className="font-mono text-[9px] text-zinc-500 uppercase mb-1">Provider ID</p>
                    <p className="font-mono text-sm font-bold text-zinc-300 break-all max-w-[300px] leading-tight">{providerId}</p>
                 </div>
              </div>
           </header>

           <main className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              <div className="lg:col-span-8 space-y-8">
                 <div className="bg-[#111111] border border-white/5 rounded-3xl overflow-hidden group relative">
                    <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#151515]">
                       <span className="font-sans font-bold uppercase text-xs text-zinc-400">Decrypted Response Details</span>
                       <button onClick={handleCopy} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 font-mono text-[10px] uppercase transition-all">
                          {copied ? 'Copied' : <><Clipboard /> Copy Payload</>}
                       </button>
                    </div>
                    <div className="p-8 font-mono text-sm text-zinc-300 leading-relaxed min-h-[400px] whitespace-pre-wrap bg-black/40 shadow-inner">
                       {result.result}
                    </div>
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-10 pointer-events-none transition-opacity">
                       <Hexagon size={120} weight="fill" className="text-white" />
                    </div>
                 </div>
              </div>

              <aside className="lg:col-span-4 space-y-6">
                 <div className="bg-[#111111] p-6 border border-white/5 rounded-3xl space-y-6">
                    <div>
                       <h4 className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-4">Transmission Info</h4>
                       <div className="space-y-4">
                          <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                             <p className="font-mono text-[8px] text-zinc-600 uppercase mb-1">Sequence #</p>
                             <p className="font-mono font-bold text-white text-lg">{result.sequenceNumber}</p>
                          </div>
                          <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                             <p className="font-mono text-[8px] text-zinc-600 uppercase mb-1">Task ID Root</p>
                             <p className="font-mono text-[10px] text-zinc-400 break-all">{taskId}</p>
                          </div>
                       </div>
                    </div>

                    <div className="pt-6 border-t border-white/5">
                       <h4 className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest mb-4">On-Chain Evidence</h4>
                       <div className="p-4 bg-zinc-900/50 rounded-2xl border border-white/5 break-all">
                          <p className="font-mono text-[8px] text-zinc-600 uppercase mb-2 text-center underline">Proof Hash</p>
                          <p className="font-mono text-[9px] leading-tight text-white/40">{result.resultHash}</p>
                       </div>
                    </div>
                 </div>
              </aside>
           </main>
        </div>
      </div>
    </div>
  )
}
