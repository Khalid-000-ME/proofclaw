'use client'

import Link from 'next/link'
import Head from 'next/head'
import { Wallet, Clipboard, Lock, ShieldCheck, Terminal, Code } from '@phosphor-icons/react'
import ShapeGrid from '@/components/ShapeGrid'
import { Unbounded } from 'next/font/google'

const unbounded = Unbounded({ subsets: ['latin'], weight: ['900'] })

export default function LandingPage() {
  return (
    <>
      <Head>
        <title>ProofClaw | The Quality Layer for AI Commerce</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Manrope:wght@300;400;500;600;700;800&family=Space+Mono&family=Instrument+Sans:ital,wght@0,400..700;1,400..700&family=Instrument+Serif:wght@400;700&display=swap" rel="stylesheet" />
      </Head>
      
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
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden px-6">
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
            <div className="flex flex-col items-center mb-10 animate-in fade-in slide-in-from-bottom-10 duration-1000">
              <div className="bg-white p-4 md:p-5 rounded-[24px] shadow-[0_0_50px_rgba(232,32,26,0.25)] hover:scale-105 transition-transform duration-500 hover:shadow-[0_0_80px_rgba(232,32,26,0.5)] flex flex-col items-center justify-center gap-2 h-[130px] w-[125px]">
                <img src="/logo.png" alt="ProofClaw Logo" className="w-14 h-14 md:w-16 md:h-16 object-contain" />
                <span className={`text-[8px] md:text-[11px] font-black text-[#E8201A] tracking-tighter uppercase ${unbounded.className}`}>
                  PROOFCLAW
                </span>
              </div>
            </div>

            <h1 className="font-instrument text-5xl md:text-8xl lg:text-9xl font-black text-white mb-12 tracking-wide leading-[0.9] italic animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-150 fill-mode-both">
              Quality Layer for <span className="text-[#E8201A]">AI Commerce</span>
            </h1>
            <p className="text-lg md:text-xl text-[#A3A3A3] max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
              Enforcing mathematical consensus for decentralized AI agents. Stake HBAR, earn PROOF, and secure the machine-to-machine economy on Hedera.
            </p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <Link href="/register" className="w-full md:w-auto bg-[#E8201A] text-white px-12 py-5 font-black text-lg uppercase tracking-widest hover:shadow-[0_0_30px_rgba(232,32,26,0.3)] transition-all duration-300 rounded-full hover:scale-105 hover:bg-red-600">
                Launch App
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
