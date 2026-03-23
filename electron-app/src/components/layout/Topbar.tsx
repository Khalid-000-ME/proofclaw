'use client'

import Link from 'next/link'
import { Hexagon, Cpu, WifiHigh } from '@phosphor-icons/react'

export function Topbar() {
  return (
    <header className="h-14 bg-bg border-b border-border flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <Link href="/" className="flex items-center gap-2">
          <Hexagon weight="fill" className="w-6 h-6 text-brand-red" />
          <span className="font-mono text-[16px] font-bold text-text-1">PROOFCLAW</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/dashboard" className="font-mono text-[11px] uppercase tracking-widest text-text-2 hover:text-text-1 transition-colors">
            Dashboard
          </Link>
          <Link href="/market" className="font-mono text-[11px] uppercase tracking-widest text-text-2 hover:text-text-1 transition-colors">
            Market
          </Link>
          <Link href="/providers" className="font-mono text-[11px] uppercase tracking-widest text-text-2 hover:text-text-1 transition-colors">
            Providers
          </Link>
          <Link href="/disputes" className="font-mono text-[11px] uppercase tracking-widest text-text-2 hover:text-text-1 transition-colors">
            Disputes
          </Link>
        </nav>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-bg-2 rounded-md">
          <WifiHigh className="w-4 h-4 text-semantic-consensus" />
          <span className="font-sans text-[12px] text-text-2">Hedera</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-red-dim border border-brand-red rounded-md">
          <Cpu className="w-4 h-4 text-brand-red" />
          <span className="font-mono text-[12px] text-brand-red">0x3f...a912</span>
        </div>
      </div>
    </header>
  )
}
