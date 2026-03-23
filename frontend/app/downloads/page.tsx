'use client'

import { Unbounded } from 'next/font/google'
import { WindowsLogo, AppleLogo, LinuxLogo, ArrowDown } from '@phosphor-icons/react'
import ShapeGrid from '@/components/ShapeGrid'

const unbounded = Unbounded({ subsets: ['latin'], weight: ['900'] })

const WindowsIcon = (props: any) => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M0 3.449L9.75 2.1V11.705H0V3.449ZM10.875 1.945L24 0V11.705H10.875V1.945ZM0 12.303H9.75V21.9L0 20.55V12.303ZM10.875 12.303H24V24L10.875 22.055V12.303Z" />
  </svg>
)

const AppleIcon = (props: any) => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.038-.013-3.182-1.221-3.22-4.857-.026-3.039 2.48-4.5 2.597-4.571-1.428-2.09-3.623-2.324-4.402-2.376-1.85-.156-3.402 1.116-4.598 1.116-.16 0 0 0 0 0Zm3.714-3.511c.831-1.014 1.39-2.43 1.233-3.847-1.207.052-2.674.805-3.545 1.819-.77.893-1.454 2.311-1.272 3.704 1.35.104 2.753-.662 3.584-1.676Z" />
  </svg>
)

export default function DownloadsPage() {
  const downloadLinks = [
    {
      os: 'Windows',
      icon: WindowsIcon,
      href: '/downloads/ProofClaw Setup 1.0.0.exe',
      label: 'Download .EXE',
      status: 'Stable v1.0.0',
      color: '#00A4EF',
      available: true
    },
    {
      os: 'macOS',
      icon: AppleIcon,
      href: '/downloads/ProofClaw-1.0.0-arm64.dmg',
      label: 'Download .DMG',
      status: 'Stable v1.0.0 (Silicon)',
      color: '#FFFFFF',
      available: true
    },
    {
      os: 'Linux',
      image: '/linux_logo.png',
      href: '#',
      label: 'Coming Soon',
      status: 'In Development',
      color: '#FCC624',
      available: false
    }
  ]

  return (
    <main className="bg-[#0a0a0a] text-white selection:bg-[#E8201A] min-h-screen relative overflow-hidden">
      {/* Background kinetic grid */}
      <div className="absolute inset-0 z-0 opacity-40">
        <ShapeGrid
          direction="diagonal"
          speed={0.2}
          borderColor="#1F1F1F"
          hoverFillColor="rgba(232, 32, 26, 0.15)"
          squareSize={80}
          shape="square"
          className="w-full h-full"
        />
      </div>

      <div className="relative z-10 pt-32 pb-20 px-6 max-w-7xl mx-auto flex flex-col items-center">
        {/* Header Section */}
        <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-10 duration-1000">
           {/* Logo Badge */}
           <div className="flex flex-col items-center mb-10">
            <div className="bg-white p-5 rounded-[28px] shadow-[0_0_50px_rgba(232,32,26,0.3)] hover:scale-105 transition-transform duration-500 flex flex-col items-center justify-center gap-2 h-[140px] w-[135px]">
              <img src="/logo.png" alt="ProofClaw Logo" className="w-16 h-16 object-contain" />
              <span className={`text-[11px] font-black text-[#E8201A] tracking-tighter uppercase ${unbounded.className}`}>
                PROOFCLAW
              </span>
            </div>
          </div>

          <h1 className="font-instrument text-6xl md:text-8xl font-black italic tracking-tight leading-none mb-6">
            Get the <span className="text-[#E8201A]">Desktop Node.</span>
          </h1>
          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto font-medium">
            Join the decentralized quality layer. Run a local provider node, stake HBAR, and participate in global AI consensus.
          </p>
        </div>

        {/* Download Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl">
          {downloadLinks.map((item, idx) => (
            <div 
              key={item.os}
              className={`relative group bg-[#111111] border border-[#2A2A2A] rounded-[32px] p-8 transition-all duration-500 hover:scale-[1.02] hover:border-[#E8201A]/50 hover:shadow-[0_0_40px_rgba(232,32,26,0.15)] animate-in fade-in slide-in-from-bottom-10 duration-1000 fill-mode-both`}
              style={{ animationDelay: `${idx * 150}ms` }}
            >
              <div className="flex flex-col items-center text-center h-full">
                <div 
                  className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-8 shadow-inner group-hover:scale-110 transition-transform duration-500 overflow-hidden"
                  style={{ color: item.color }}
                >
                  {item.icon ? (
                    <item.icon size={44} weight="duotone" />
                  ) : (
                    <img src={item.image} alt={item.os} className="w-14 h-14 object-contain brightness-0 invert" />
                  )}
                </div>
                
                <h3 className="text-3xl font-black uppercase tracking-tight mb-2">
                  {item.os}
                </h3>
                
                <span className="text-[10px] mono-font font-black uppercase tracking-[0.2em] text-[#E8201A] mb-10 h-4">
                  {item.status}
                </span>

                <div className="mt-auto w-full">
                  {item.available ? (
                    <a 
                      href={item.href}
                      download
                      className="flex items-center justify-center gap-3 w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-[#E8201A] hover:text-white transition-all duration-300 group-hover:shadow-[0_0_25px_rgba(232,32,26,0.3)]"
                    >
                      <ArrowDown size={20} weight="bold" />
                      {item.label}
                    </a>
                  ) : (
                    <button 
                      disabled
                      className="w-full bg-zinc-900 text-zinc-600 py-5 rounded-2xl font-black uppercase tracking-widest text-sm border border-zinc-800 opacity-50 cursor-not-allowed"
                    >
                      {item.label}
                    </button>
                  )}
                </div>
              </div>

              {/* Decorative Glow */}
              <div className="absolute -inset-px rounded-[32px] bg-gradient-to-b from-[#E8201A]/0 via-[#E8201A]/0 to-[#E8201A]/5 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-500" />
            </div>
          ))}
        </div>

        {/* Footer Info */}
        <div className="mt-24 text-center animate-in fade-in duration-1000 delay-700 fill-mode-both">
          <p className="text-zinc-500 text-sm mono-font uppercase tracking-widest font-bold mb-4">
            Current Build: v1.0.0-PROD
          </p>
          <div className="w-16 h-1 bg-[#E8201A]/20 mx-auto rounded-full" />
        </div>
      </div>
    </main>
  )
}
