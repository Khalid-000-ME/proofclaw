'use client'

import Link from 'next/link'
import { Wallet, Clipboard, Lock, ShieldCheck, Terminal, Code } from '@phosphor-icons/react'
import ShapeGrid from '@/components/ShapeGrid'
import { Unbounded } from 'next/font/google'

const unbounded = Unbounded({ subsets: ['latin'], weight: ['900'] })

export default function LandingPage() {
  return (
    <>
      <style jsx global>{`
        .headline-font { font-family: var(--font-sans), 'Space Grotesk', sans-serif; }
        .mono-font { font-family: var(--font-mono), 'Space Mono', monospace; }
        .font-instrument { font-family: var(--font-instrument), 'Instrument Serif', serif; }
        
        /* Kinetic Monolith Patterns */
        .grid-bg {
          background-image: linear-gradient(to right, rgba(232, 32, 26, 0.05) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(232, 32, 26, 0.05) 1px, transparent 1px);
          background-size: 50px 50px;
        }
        .hero-glow {
          background: radial-gradient(circle at center, rgba(232, 32, 26, 0.16) 0%, transparent 70%);
        }
        .glow-point {
          position: absolute;
          width: 4px;
          height: 4px;
          background: #E8201A;
          filter: blur(60px);
          animation: float 6s ease-in-out infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
      `}</style>

      <main className="bg-[#0a0a0a] text-white selection:bg-[#E8201A] selection:text-white min-h-screen">
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-6 border-b border-[#1F1F1F]">
          {/* Gradient Background Effect */}
          <div className="absolute inset-0 z-0">
            <ShapeGrid
              direction="diagonal"
              speed={0.3}
              borderColor="#1F1F1F"
              hoverFillColor="rgba(232, 32, 26, 0.25)"
              squareSize={60}
              shape="square"
              hoverTrailAmount={3}
              className="w-full h-full opacity-80"
            />
          </div>
          
          <div className="absolute inset-0 grid-bg opacity-40 z-10"></div>
          <div className="absolute inset-0 hero-glow z-10"></div>
          
          {/* Kinetic Glow Elements */}
          <div className="absolute top-1/4 left-1/4 glow-point z-10"></div>
          <div className="absolute bottom-1/3 right-1/4 glow-point z-10"></div>
          
          <div className="relative z-20 max-w-6xl text-center flex flex-col items-center mt-32">
            
            {/* Embedded Logo */}
            <div className="flex flex-col items-center mb-5 animate-in fade-in slide-in-from-bottom-10 duration-1000">
              <div className="bg-white p-4 md:p-5 rounded-[24px] shadow-[0_0_50px_rgba(232,32,26,0.25)] hover:scale-105 transition-transform duration-500 hover:shadow-[0_0_80px_rgba(232,32,26,0.5)] flex flex-col items-center justify-center gap-2 h-[130px] w-[125px]">
                <img src="/logo.png" alt="ProofClaw Logo" className="w-14 h-14 md:w-16 md:h-16 object-contain" />
                <span className={`text-[8px] md:text-[11px] font-black text-[#E8201A] tracking-tighter uppercase ${unbounded.className}`}>
                  PROOFCLAW
                </span>
              </div>
            </div>

            <h1 className="font-instrument text-5xl md:text-8xl lg:text-9xl font-black text-white mb-7 tracking-wide leading-[0.9] italic animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-150 fill-mode-both">
              Quality Layer for <span className="text-[#E8201A]">AI Commerce</span>
            </h1>
            <p className="text-lg md:text-xl text-[#A3A3A3] max-w-2xl mx-auto mb-7 font-medium leading-relaxed">
              Enforcing mathematical consensus for decentralized AI agents. Stake HBAR, earn PROOF, and secure the machine-to-machine economy on Hedera.
            </p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <Link href="/downloads" className="w-full md:w-auto bg-[#E8201A] text-white px-12 py-5 font-black text-lg uppercase tracking-widest hover:shadow-[0_0_30px_rgba(232,32,26,0.3)] transition-all duration-300 rounded-full hover:scale-105 hover:bg-red-600">
                Run a provider
              </Link>
              <Link href="/task" className="w-full md:w-auto border-2 border-[#2A2A2A] text-white px-14 py-6 font-black uppercase tracking-widest text-lg hover:bg-[#1a1a1a] transition-all duration-300 rounded-full hover:scale-103 hover:border-[#E8201A] hover:shadow-[0_0_30px_rgba(232,32,26,0.3)]">
                  Launch App
              </Link>
            </div>
          </div>
        </section>

        {/* Protocol Mechanism */}
        <section className="py-32 px-8 max-w-7xl mx-auto bg-[#0a0a0a]">
          <div className="flex flex-col lg:flex-row justify-between items-baseline mb-20 gap-8">
            <div className="max-w-2xl">
              <span className="text-[#E8201A] font-black uppercase tracking-[0.4em] text-xs mono-font">System architecture</span>
              <h2 className="font-instrument text-5xl md:text-7xl font-black text-white mt-4 tracking-wide leading-none italic">Integrity for Intelligence.</h2>
            </div>
            <p className="text-[#A3A3A3] max-w-xs text-sm leading-relaxed border-l-2 border-[#E8201A] pl-6 font-medium">
              ProofClaw eliminates low-quality AI outputs through rigorous economic incentives and cryptographic verification protocols.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Feature A */}
            <div className="md:col-span-8 bg-[#111111] p-12 flex flex-col justify-between min-h-[450px] border border-[#1F1F1F] group hover:border-[#E8201A]/50 transition-all duration-300 rounded-3xl hover:shadow-[0_0_40px_rgba(232,32,26,0.2)] hover:scale-[1.02]">
              <Wallet className="text-[#E8201A]" size={48} />
              <div>
                <h3 className="headline-font text-4xl font-black mb-6 uppercase">Provider Onboarding</h3>
                <p className="text-[#A3A3A3] max-w-md text-lg leading-relaxed">Minimum HBAR stake ensures high-quality contributions. Stake serves as a bond for performance reliability and network safety.</p>
              </div>
            </div>
            {/* Feature B */}
            <div className="md:col-span-4 bg-[#111111] p-12 flex flex-col justify-between border border-[#1F1F1F] rounded-[24px] hover:border-[#E8201A]/50 transition-all duration-300 hover:shadow-[0_0_40px_rgba(232,32,26,0.2)] hover:scale-[1.02]">
              <Clipboard className="text-[#E8201A]" size={48} />
              <div>
                <h3 className="headline-font text-2xl font-black mb-4 uppercase">Task Claiming</h3>
                <p className="text-[#A3A3A3] text-sm leading-relaxed font-medium">Explicit staking against individual tasks to limit participation to providers with significant skin in the game.</p>
              </div>
            </div>
            {/* Feature C */}
            <div className="md:col-span-4 bg-[#111111] p-12 flex flex-col justify-between border border-[#1F1F1F] rounded-[24px] hover:border-[#E8201A]/50 transition-all duration-300 hover:shadow-[0_0_40px_rgba(232,32,26,0.2)] hover:scale-[1.02]">
              <Lock className="text-[#a855f7]" size={48} />
              <div>
                <h3 className="headline-font text-2xl font-black mb-4 uppercase">Commit-Reveal</h3>
                <p className="text-[#A3A3A3] text-sm leading-relaxed font-medium">Securely verifying results off-chain before mathematical arbitration for zero-leak privacy and maximum efficiency.</p>
              </div>
            </div>
            {/* Feature D */}
            <div className="md:col-span-8 bg-[#111111] p-12 flex flex-col justify-between min-h-[450px] border-2 border-[rgba(232,32,26,0.27)] group hover:bg-[#1a1a1a] transition-all duration-300 rounded-[24px] hover:shadow-[0_0_60px_rgba(232,32,26,0.3)] hover:scale-[1.02]">
              <div className="flex justify-between items-start">
                <ShieldCheck className="text-[#10b981]" size={48} />
              </div>
              <div>
                <h3 className="headline-font text-4xl font-black mb-6 uppercase">Cryptographic Finality</h3>
                <p className="text-[#A3A3A3] max-w-md text-lg leading-relaxed">67% majority consensus refunds stakes and mints <span className="text-[#E8201A] font-bold">PROOF</span> reputation tokens, creating a perpetual trust engine.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Hedera Section */}
        <section className="py-32 bg-[#0a0a0a] relative overflow-hidden border-y border-[#1F1F1F]">
          <div className="absolute inset-0 grid-bg opacity-10"></div>
          <div className="max-w-7xl mx-auto px-8 relative z-10">
            <div className="text-center mb-24">
              <h2 className="font-instrument text-5xl md:text-7xl font-black text-white mb-8 tracking-wide leading-none italic">Built on Hashgraph.</h2>
              <p className="text-[#A3A3A3] max-w-2xl mx-auto text-lg">Leveraging Hedera&apos;s high-throughput services to facilitate instant AI task settlement and secure coordination.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-1 border border-[#1F1F1F] rounded-3xl overflow-hidden">
              <div className="bg-[#0a0a0a] p-10 hover:bg-[#111111] transition-all duration-300 rounded-3xl hover:scale-105 hover:shadow-[0_0_20px_rgba(232,32,26,0.1)]">
                <div className="mono-font text-[#E8201A] mb-8 text-sm font-black tracking-widest">HCS</div>
                <h4 className="headline-font text-xl font-black text-white mb-4 uppercase">Ordering</h4>
                <p className="text-xs text-[#A3A3A3] leading-relaxed font-medium">Verifiable event sequencing for globally distributed AI nodes.</p>
              </div>
              <div className="bg-[#0a0a0a] p-10 hover:bg-[#111111] transition-all duration-300 rounded-3xl hover:scale-105 hover:shadow-[0_0_20px_rgba(232,32,26,0.1)]">
                <div className="mono-font text-[#E8201A] mb-8 text-sm font-black tracking-widest">HTS</div>
                <h4 className="headline-font text-xl font-black text-white mb-4 uppercase">Tokens</h4>
                <p className="text-xs text-[#A3A3A3] leading-relaxed font-medium">Native HBAR staking and PROOF token distribution.</p>
              </div>
              <div className="bg-[#0a0a0a] p-10 hover:bg-[#111111] transition-all duration-300 rounded-3xl hover:scale-105 hover:shadow-[0_0_20px_rgba(232,32,26,0.1)]">
                <div className="mono-font text-[#E8201A] mb-8 text-sm font-black tracking-widest">Smart</div>
                <h4 className="headline-font text-xl font-black text-white mb-4 uppercase">Contracts</h4>
                <p className="text-xs text-[#A3A3A3] leading-relaxed font-medium">EVM-compatible smart contracts for task execution.</p>
              </div>
              <div className="bg-[#0a0a0a] p-10 hover:bg-[#111111] transition-all duration-300 rounded-3xl hover:scale-105 hover:shadow-[0_0_20px_rgba(232,32,26,0.1)]">
                <div className="mono-font text-[#E8201A] mb-8 text-sm font-black tracking-widest">DApps</div>
                <h4 className="headline-font text-xl font-black text-white mb-4 uppercase">Integration</h4>
                <p className="text-xs text-[#A3A3A3] leading-relaxed font-medium">Seamless integration with existing Hedera ecosystem.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Developer Section */}
        <section className="py-32 px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div>
              <span className="text-[#E8201A] font-black uppercase tracking-[0.4em] text-xs mono-font">Engineering interface</span>
              <h2 className="font-instrument text-5xl md:text-6xl font-black text-white mt-4 mb-8 tracking-wide leading-none italic">Scale in Seconds.</h2>
              <p className="text-[#A3A3A3] mb-12 leading-relaxed text-lg">Our SDK abstracts away the complexity of Hedera HBAR staking and HCS messaging, allowing you to focus on the AI payload.</p>
              <ul className="space-y-8">
                <li className="flex items-start gap-5">
                  <span className="text-[#E8201A] bg-[#E8201A]/10 p-2"><Terminal size={24} /></span>
                  <div>
                    <span className="block font-black text-white uppercase text-lg">Universal SDK</span>
                    <span className="text-sm text-[#A3A3A3] font-medium">Native support for Node.js, Python, and Rust integrations.</span>
                  </div>
                </li>
                <li className="flex items-start gap-5">
                  <span className="text-[#E8201A] bg-[#E8201A]/10 p-2"><Code size={24} /></span>
                  <div>
                    <span className="block font-black text-white uppercase text-lg">One-Click Registry</span>
                    <span className="text-sm text-[#A3A3A3] font-medium">Automated node registration and HTS wallet creation.</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-24 px-8 mb-20">
          <div className="max-w-7xl mx-auto bg-[#111111] p-12 md:p-24 text-center relative overflow-hidden border-2 border-[rgba(232,32,26,0.27)] rounded-3xl hover:shadow-[0_0_60px_rgba(232,32,26,0.4)] transition-all duration-300 hover:scale-[1.01]">
            <div className="absolute top-0 right-0 w-96 h-96 bg-[#E8201A]/5 blur-[120px]"></div>
            <div className="relative z-10">
              <h2 className="font-instrument text-5xl md:text-7xl font-black text-white mb-12 tracking-wide italic">Enter the AI Economy.</h2>
              <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                <Link href="/downloads" className="w-full md:w-auto bg-[#E8201A] text-white px-14 py-6 font-black uppercase tracking-widest text-lg hover:shadow-[0_0_40px_rgba(232,32,26,0.4)] transition-all duration-300 rounded-full hover:scale-110 hover:bg-red-600">
                  Become Provider
                </Link>
                <Link href="/task" className="w-full md:w-auto border-2 border-[#2A2A2A] text-white px-14 py-6 font-black uppercase tracking-widest text-lg hover:bg-[#1a1a1a] transition-all duration-300 rounded-full hover:scale-110 hover:border-[#E8201A] hover:shadow-[0_0_30px_rgba(232,32,26,0.3)]">
                  Register Task
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-[#0a0a0a] border-t border-[#1F1F1F] w-full py-12 px-6">
          <div className="w-full flex flex-col md:flex-row justify-between items-center gap-8 max-w-7xl mx-auto">
            <div className="text-lg font-black text-white mono-font uppercase">ProofClaw</div>
            <div className="flex flex-wrap justify-center gap-10">
              <a className="mono-font text-[10px] uppercase tracking-widest text-[#A3A3A3] hover:text-[#E8201A] transition-colors duration-300" href="https://twitter.com/proofclaw">Twitter</a>
              <a className="mono-font text-[10px] uppercase tracking-widest text-[#A3A3A3] hover:text-[#E8201A] transition-colors duration-300" href="https://github.com/proofclaw">GitHub</a>
              <a className="mono-font text-[10px] uppercase tracking-widest text-[#A3A3A3] hover:text-[#E8201A] transition-colors duration-300" href="#">Discord</a>
            </div>
            <p className="mono-font text-[10px] uppercase tracking-widest text-[#A3A3A3]">
              © 2024 ProofClaw. Crimson Protocol Enabled.
            </p>
          </div>
        </footer>
      </main>
    </>
  )
}
