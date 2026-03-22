'use client'


import { StatusBadge } from '@/components/shared/StatusBadge'
import { WarningOctagon, ArrowSquareOut } from '@phosphor-icons/react'
import Link from 'next/link'

export default function DisputesPage() {
  return (
    <div className="min-h-screen bg-bg">

      <main className="p-6 lg:p-10 max-w-screen-xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="font-mono text-[24px] font-bold text-text-1">
              DISPUTES
            </h1>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-semantic-pending-dim border border-semantic-pending rounded-md">
              <WarningOctagon className="w-4 h-4 text-semantic-pending" />
              <span className="font-mono text-[12px] text-semantic-pending">2 open disputes</span>
            </div>
          </div>
          
          {/* Open Disputes */}
          <div className="bg-bg-2 border border-border rounded-lg p-6 mb-6">
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-text-3 mb-4">
              OPEN DISPUTES
            </h2>
            <div className="space-y-4">
              <div className="border border-border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="font-mono text-[13px] text-text-1">Task #4818</span>
                    <span className="font-sans text-[13px] text-text-2 ml-3">PREDICTION</span>
                  </div>
                  <StatusBadge state="DISPUTED" />
                </div>
                <p className="font-sans text-[13px] text-text-2 mb-3">
                  Posted 14:31:39 · Dispute opened 14:33:02 · Closes in 47m 18s
                </p>
                <p className="font-sans text-[13px] text-text-2 mb-3">
                  Providers disagreed: 0x3f... → hash A · 0x7a... → hash B
                </p>
                <p className="font-mono text-[13px] text-text-1 mb-4">
                  Stake at risk: 30 HBAR total
                </p>
                <div className="flex gap-3">
                  <Link href="/market/4818" className="text-brand-red font-sans text-[13px] hover:underline">
                    VIEW TASK
                  </Link>
                  <button className="text-brand-orange font-sans text-[13px] hover:underline">
                    CHALLENGE AS VALIDATOR
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Challenge Panel */}
          <div className="bg-bg-2 border border-border rounded-lg p-6 mb-6">
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-text-3 mb-4">
              CHALLENGE PANEL (Task #4818)
            </h2>
            <p className="font-sans text-[13px] text-text-2 mb-4">
              You are staking 20 HBAR to vote. Review both results and vote for the correct one.
            </p>
            <div className="flex gap-4 mb-4">
              <button className="flex-1 bg-bg-3 border border-border-2 hover:border-brand-red text-text-1 py-3 rounded-md font-sans text-[13px] transition-colors">
                Result A (hash 0xa1b2...)
              </button>
              <button className="flex-1 bg-bg-3 border border-border-2 hover:border-brand-red text-text-1 py-3 rounded-md font-sans text-[13px] transition-colors">
                Result B (hash 0xc3d4...)
              </button>
            </div>
            <div className="text-text-2 font-sans text-[13px]">
              <p>Current votes:</p>
              <p className="mt-1">A: 3 validators (60 HBAR)</p>
              <p>B: 1 validator (20 HBAR)</p>
            </div>
          </div>
          
          {/* Resolved Disputes */}
          <div className="bg-bg-2 border border-border rounded-lg p-6">
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-text-3 mb-4">
              RESOLVED DISPUTES (last 10)
            </h2>
            <div className="space-y-2">
              {[
                { id: '#4801', type: 'CLASSIFICATION', winner: 'A', votes: '3/4', slashed: 15 },
                { id: '#4793', type: 'EXTRACTION', winner: 'B', votes: '4/4', slashed: 20 },
              ].map((dispute) => (
                <div key={dispute.id} className="flex justify-between items-center py-2 border-b border-border">
                  <span className="font-mono text-[13px] text-text-1">{dispute.id}</span>
                  <span className="font-sans text-[13px] text-text-2">{dispute.type}</span>
                  <span className="font-sans text-[13px] text-semantic-consensus">
                    {dispute.winner} won ({dispute.votes} votes)
                  </span>
                  <span className="font-mono text-[13px] text-semantic-slashed">{dispute.slashed} HBAR slashed</span>
                  <span className="font-mono text-[13px] text-text-3">14:12:04</span>
                </div>
              ))}
            </div>
          </div>
      </main>
    </div>
  )
}
