'use client'

import Link from 'next/link'
import { TrendUp, Cpu, CurrencyDollar, Hexagon, Gear } from '@phosphor-icons/react'
import { Unbounded } from 'next/font/google'

const unbounded = Unbounded({ subsets: ['latin'], weight: ['900'] })

export function Sidebar() {
  return (
    <aside className="w-[260px] h-screen bg-[#111111] border-r border-white/5 p-6 flex flex-col z-[200]">
      {/* App Header / Drag Region */}
      <div className="flex flex-col items-center mb-12 mt-6 select-none cursor-default">
         <div className="bg-white p-2.5 rounded-xl shadow-[0_0_20px_rgba(232,32,26,0.2)] flex flex-col items-center gap-1.5 w-16 h-16 justify-center hover:scale-105 transition-transform duration-300">
            <img src="/logo.png" alt="ProofClaw Logo" className="w-8 h-8 object-contain" />
            <span className={`text-[7px] font-black text-[#E8201A] tracking-tighter uppercase leading-none ${unbounded.className}`}>
               PROOFCLAW
            </span>
         </div>
      </div>

      <div className="space-y-1 flex-1 overflow-y-auto scrollbar-hide">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-3 py-3 rounded-xl text-zinc-500 hover:bg-white/5 hover:text-white transition-all group"
        >
          <Cpu size={18} className="group-hover:text-[#E8201A]" />
          <span className="font-sans font-black text-xs uppercase tracking-tight">Provider Node</span>
        </Link>
        <Link
          href="/register"
          className="flex items-center gap-3 px-3 py-3 rounded-xl text-zinc-500 hover:bg-white/5 hover:text-white transition-all group"
        >
          <CurrencyDollar size={18} className="group-hover:text-[#E8201A]" />
          <span className="font-sans font-black text-xs uppercase tracking-tight">On-Chain Sync</span>
        </Link>
        <Link
          href="/market"
          className="flex items-center gap-3 px-3 py-3 rounded-xl text-zinc-500 hover:bg-white/5 hover:text-white transition-all group"
        >
          <TrendUp size={18} className="group-hover:text-[#E8201A]" />
          <span className="font-sans font-black text-xs uppercase tracking-tight">Marketplace</span>
        </Link>
      </div>
    </aside>
  )
}
