'use client'

import Link from 'next/link'
import { Lightning, Cpu, CurrencyDollar, Hexagon } from '@phosphor-icons/react'

export function Sidebar() {
  return (
    <aside className="w-[220px] min-h-[calc(100vh-56px)] bg-bg-2 border-r border-border hidden lg:block p-4">
      <div className="space-y-1">
        <Link
          href="/market"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-text-2 hover:bg-bg-3 hover:text-text-1 transition-colors"
        >
          <Lightning className="w-4 h-4" />
          <span className="font-sans text-[13px]">Live Tasks</span>
        </Link>
        <Link
          href="/node"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-text-2 hover:bg-bg-3 hover:text-text-1 transition-colors"
        >
          <Cpu className="w-4 h-4" />
          <span className="font-sans text-[13px]">My Node</span>
        </Link>
        <Link
          href="/node"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-text-2 hover:bg-bg-3 hover:text-text-1 transition-colors"
        >
          <CurrencyDollar className="w-4 h-4" />
          <span className="font-sans text-[13px]">Earnings</span>
        </Link>
        <Link
          href="/node"
          className="flex items-center gap-3 px-3 py-2 rounded-md text-text-2 hover:bg-bg-3 hover:text-text-1 transition-colors"
        >
          <Hexagon className="w-4 h-4" />
          <span className="font-sans text-[13px]">PROOF Balance</span>
        </Link>
      </div>
      
      <div className="mt-8 pt-6 border-t border-border">
        <p className="font-mono text-[11px] uppercase tracking-widest text-text-3 px-3 mb-3">
          Network
        </p>
        <div className="px-3 space-y-2">
          <div className="flex justify-between">
            <span className="font-sans text-[12px] text-text-2">Tasks</span>
            <span className="font-mono text-[12px] text-text-1">1,284</span>
          </div>
          <div className="flex justify-between">
            <span className="font-sans text-[12px] text-text-2">Providers</span>
            <span className="font-mono text-[12px] text-text-1">38</span>
          </div>
          <div className="flex justify-between">
            <span className="font-sans text-[12px] text-text-2">Staked</span>
            <span className="font-mono text-[12px] text-text-1">48.2K</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
