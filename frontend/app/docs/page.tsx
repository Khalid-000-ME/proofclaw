'use client'



export default function DocsPage() {
  return (
    <div className="min-h-screen bg-bg">

      <main className="p-6 lg:p-10 max-w-4xl mx-auto">
          <h1 className="font-mono text-[24px] font-bold text-text-1 mb-8">
            DOCUMENTATION
          </h1>
          
          <div className="space-y-8">
            <section>
              <h2 className="font-mono text-[18px] font-bold text-text-1 mb-4">Getting Started</h2>
              <p className="font-sans text-[14px] text-text-2 leading-relaxed">
                ProofClaw is a quality-staked AI task market on Hedera. Providers stake HBAR on the correctness of every result they return. Disputes are arbitrated by the network using HCS consensus ordering as the ground truth.
              </p>
            </section>
            
            <section>
              <h2 className="font-mono text-[18px] font-bold text-text-1 mb-4">Running a Provider Node</h2>
              <div className="bg-bg-2 border border-border rounded-lg p-4 font-mono text-[13px] text-text-2">
                <p className="text-brand-red">$ git clone https://github.com/proofclaw/proofclaw.git</p>
                <p className="text-brand-red">$ cd proofclaw</p>
                <p className="text-brand-red">$ npm install</p>
                <p className="text-brand-red">$ cp .env.example .env</p>
                <p className="text-brand-red">$ npm run register-provider</p>
                <p className="text-brand-red">$ npm run provider</p>
              </div>
            </section>
            
            <section>
              <h2 className="font-mono text-[18px] font-bold text-text-1 mb-4">Contract Addresses (Testnet)</h2>
              <div className="bg-bg-2 border border-border rounded-lg p-4 space-y-2 font-mono text-[13px]">
                <div className="flex justify-between">
                  <span className="text-text-2">TaskRegistry</span>
                  <span className="text-text-1">0x...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-2">TaskEscrow</span>
                  <span className="text-text-1">0x...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-2">TaskConsensus</span>
                  <span className="text-text-1">0x...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-2">ProviderRegistry</span>
                  <span className="text-text-1">0x...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-2">ProofToken</span>
                  <span className="text-text-1">0x...</span>
                </div>
              </div>
            </section>
            
            <section>
              <h2 className="font-mono text-[18px] font-bold text-text-1 mb-4">API Reference</h2>
              <p className="font-sans text-[14px] text-text-2 leading-relaxed mb-4">
                Tasks are posted via x402 payment protocol. Results are submitted to HCS topics.
              </p>
              <div className="bg-bg-2 border border-border rounded-lg p-4">
                <p className="font-mono text-[13px] text-brand-orange mb-2">POST /task</p>
                <p className="font-sans text-[13px] text-text-2">Create a new task with x402 payment</p>
              </div>
            </section>
          </div>
      </main>
    </div>
  )
}
