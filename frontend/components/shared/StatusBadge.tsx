'use client'

import { Checks, HourglassHigh, WarningOctagon, Knife, Lightning } from '@phosphor-icons/react'

type TaskState = 'OPEN' | 'CLAIMED' | 'CONSENSUS' | 'SETTLED' | 'DISPUTED' | 'SLASHED'

interface StatusBadgeProps {
  state: TaskState
}

export function StatusBadge({ state }: StatusBadgeProps) {
  const styles: Record<TaskState, { bg: string; text: string; border: string; icon: React.ReactNode }> = {
    OPEN: {
      bg: 'transparent',
      text: 'text-text-2',
      border: 'border-text-3',
      icon: <Lightning className="w-3 h-3" />
    },
    CLAIMED: {
      bg: 'bg-semantic-pending/10',
      text: 'text-semantic-pending',
      border: 'border-semantic-pending',
      icon: <HourglassHigh className="w-3 h-3" />
    },
    CONSENSUS: {
      bg: 'bg-semantic-consensus/10',
      text: 'text-semantic-consensus',
      border: 'border-semantic-consensus',
      icon: <Checks className="w-3 h-3" />
    },
    SETTLED: {
      bg: 'bg-brand-red/10',
      text: 'text-brand-red',
      border: 'border-brand-red',
      icon: <Checks className="w-3 h-3 font-bold" />
    },
    DISPUTED: {
      bg: 'bg-semantic-dispute/10',
      text: 'text-semantic-dispute',
      border: 'border-semantic-dispute',
      icon: <WarningOctagon className="w-3 h-3" />
    },
    SLASHED: {
      bg: 'bg-semantic-slashed-dim',
      text: 'text-semantic-slashed',
      border: 'border-semantic-slashed',
      icon: <Knife className="w-3 h-3" />
    },
  }

  const style = styles[state] || {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    border: 'border-gray-300',
    icon: <Lightning className="w-3 h-3" />
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}>
      {style.icon}
      {state}
    </span>
  )
}
