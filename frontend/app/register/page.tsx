'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Check, Horse, Lightning, Robot, Circle, ArrowClockwise, CheckCircle, XCircle, Link as LinkIcon, Copy, Check as CheckIcon, Wallet, Gear, Cloud, Brain, DownloadSimple } from '@phosphor-icons/react'

// ─── Constants ────────────────────────────────────────────────────────────────

const HEDERA_TESTNET_CHAIN_ID = '0x128'

const PROVIDER_REGISTRY_ABI = [
  {
    name: 'register',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: '_hcsAgentId', type: 'bytes32' },
      { name: '_metadataURI', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'getProvider',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '_provider', type: 'address' }],
    outputs: [
      {
        type: 'tuple',
        components: [
          { name: 'providerAddress', type: 'address' },
          { name: 'hcsAgentId', type: 'bytes32' },
          { name: 'stakedHBAR', type: 'uint256' },
          { name: 'totalTasksCompleted', type: 'uint256' },
          { name: 'totalTasksSlashed', type: 'uint256' },
          { name: 'reputationScore', type: 'uint256' },
          { name: 'proofTokensEarned', type: 'uint256' },
          { name: 'isActive', type: 'bool' },
          { name: 'registeredAt', type: 'uint256' },
          { name: 'metadataURI', type: 'string' },
        ],
      },
    ],
  },
]

// ─── Types ────────────────────────────────────────────────────────────────────

type LLMProvider = 'ollama' | 'gemini' | 'claude'
type Step = 1 | 2 | 3 | 4 | 5
type TxStatus = 'idle' | 'switching_chain' | 'pending' | 'confirming' | 'success' | 'error'

interface FormState {
  walletAddress: string
  hederaAccountId: string
  hederaPrivateKey: string
  evmPrivateKey: string
  tasksTopic: string
  stakePerTask: number
  maxConcurrentTasks: number
  taskTypes: string[]
  llmProvider: LLMProvider
  ollamaUrl: string
  ollamaModel: string
  geminiApiKey: string
  anthropicApiKey: string
  registrationStake: number
}

interface ProviderInfo {
  isActive: boolean
  stakedHBAR: string
  reputationScore: string
  registeredAt: string
  hcsAgentId: string
}

const ALL_TASK_TYPES = ['CLASSIFICATION', 'EXTRACTION', 'SCORING', 'VERIFICATION']
const MODELS: Record<LLMProvider, string[]> = {
  ollama: ['llama3:8b', 'llama3.2:3b', 'llama3.2:1b', 'mistral:7b', 'phi3:mini', 'gemma2:2b'],
  gemini: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
  claude: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
}

const STEP_LABELS = ['Wallets', 'Network', 'Inference', 'Register', 'Config']

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function RegisterPage() {
  const [step, setStep] = useState<Step>(1)
  const [txHash, setTxHash] = useState('')
  const [agentId, setAgentId] = useState('')
  const [providerInfo, setProviderInfo] = useState<ProviderInfo | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [contracts, setContracts] = useState<any>({})

  useEffect(() => {
    fetch('/api/config/contracts')
      .then(res => res.json())
      .then(d => setContracts(d))
      .catch(console.error)
  }, [])

  const [form, setForm] = useState<FormState>({
    walletAddress: '',
    hederaAccountId: '',
    hederaPrivateKey: '',
    evmPrivateKey: '',
    tasksTopic: '',
    stakePerTask: 1,
    maxConcurrentTasks: 3,
    taskTypes: ['CLASSIFICATION', 'EXTRACTION', 'SCORING', 'VERIFICATION'],
    llmProvider: 'ollama',
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'qwen3:4b',
    geminiApiKey: '',
    anthropicApiKey: '',
    registrationStake: 1,
  })

  async function connectMetaMask() {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      alert('MetaMask not detected. Please install it.')
      return
    }
    setConnecting(true)
    try {
      const accounts: string[] = await (window as any).ethereum.request({ method: 'eth_requestAccounts' })
      if (accounts[0]) setForm((f) => ({ ...f, walletAddress: accounts[0] }))
    } finally {
      setConnecting(false)
    }
  }

  return (
    <>
      <style jsx global>{`
        .kinetic-border { border: 1px solid #1F1F1F; border-radius: 1.5rem; }
        .signature-glow:hover { box-shadow: 0 0 20px rgba(232, 32, 26, 0.16); transform: scale(1.02); transition: all 0.3s ease; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #E8201A; }
        .font-headline { font-family: var(--font-mono), 'Space Grotesk', sans-serif; }
        .font-mono { font-family: var(--font-mono), 'Space Grotesk', sans-serif; }
        .font-body { font-family: var(--font-mono), 'Space Grotesk', sans-serif; }
      `}</style>

      <div className="min-h-screen bg-[#0a0a0a] text-[#e5e2e1] font-body selection:bg-[#E8201A] selection:text-white">
        <main className="min-h-screen pt-24 pb-24 px-4 max-w-4xl mx-auto">
          {/* Header Section */}
          <header className="mb-12 border-l-4 border-[#E8201A] pl-8 rounded-r-2xl hover:shadow-[0_0_30px_rgba(232,32,26,0.2)] transition-all duration-300">
            <h1 className="font-sans text-5xl font-black tracking-tighter uppercase mb-2">Provider Registration</h1>
            <p className="font-sans text-xs uppercase tracking-[0.2em] text-zinc-500">Register your Provider</p>
          </header>

          {/* Step Indicator */}
          <div className="grid grid-cols-5 gap-1 mb-12">
            {STEP_LABELS.map((label, i) => (
              <div key={label} className={`flex flex-col gap-2 ${i + 1 > step ? 'opacity-50' : ''}`}>
                <div className={`h-1 ${i + 1 <= step ? 'bg-[#E8201A]' : 'bg-zinc-800'}`}></div>
                <span className={`font-sans font-bold text-[10px] uppercase ${i + 1 <= step ? 'text-[#E8201A]' : 'text-zinc-500'}`}>
                  0{i + 1} // {label}
                </span>
              </div>
            ))}
          </div>

          {/* Registration Workspace */}
          <div className="space-y-8">
            {/* Step 1: Identity Linking */}
            {step === 1 && (
              <Step1Wallet 
                form={form} 
                setForm={setForm} 
                onNext={() => setStep(2)} 
                connectMetaMask={connectMetaMask}
                connecting={connecting}
              />
            )}

            {/* Step 2: Network Configuration */}
            {step === 2 && (
              <Step2Network form={form} setForm={setForm} onNext={() => setStep(3)} onBack={() => setStep(1)} />
            )}

            {/* Step 3: Inference Configuration */}
            {step === 3 && (
              <Step3LLM form={form} setForm={setForm} onNext={() => setStep(4)} onBack={() => setStep(2)} />
            )}

            {/* Step 4: On-chain Registration */}
            {step === 4 && (
              <Step4Register 
                form={form} 
                setForm={setForm} 
                contracts={contracts}
                onBack={() => setStep(3)}
                onNext={(hash: string, aid: string, info: ProviderInfo | null) => {
                  setTxHash(hash)
                  setAgentId(aid)
                  setProviderInfo(info)
                  setStep(5)
                }}
              />
            )}

            {/* Step 5: Deployment Manifest */}
            {step === 5 && (
              <Step5Config form={form} txHash={txHash} agentId={agentId} providerInfo={providerInfo} contracts={contracts} />
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-[#0a0a0a] border-t border-zinc-800/15 flex flex-col md:flex-row justify-between items-center w-full px-8 py-6 gap-4 sticky bottom-0 z-50 rounded-t-3xl hover:shadow-[0_0_30px_rgba(232,32,26,0.1)] transition-all duration-300">
          <div className="font-sans text-[10px] uppercase tracking-widest text-[#E8201A] font-bold">
            PROOFCLAW // NEURAL NETWORK LAYER
          </div>
          <div className="flex gap-6">
            <Link href="/dashboard" className="font-sans text-[10px] uppercase tracking-widest text-zinc-600 hover:text-[#E8201A] underline underline-offset-4">PROTOCOL_STATUS</Link>
            <Link href="/docs" className="font-sans text-[10px] uppercase tracking-widest text-zinc-600 hover:text-[#E8201A] underline underline-offset-4">SLA_REPORT</Link>
            <Link href="/node" className="font-sans text-[10px] uppercase tracking-widest text-zinc-600 hover:text-[#E8201A] underline underline-offset-4">TERMINAL_ACCESS</Link>
          </div>
        </footer>
      </div>
    </>
  )
}

// ─── Step 1: Identity Linking ───────────────────────────────────────────────────

function Step1Wallet({ form, setForm, onNext, connectMetaMask, connecting }: { 
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  onNext: () => void
  connectMetaMask: () => void
  connecting: boolean
}) {
  const ready = form.walletAddress && form.hederaAccountId && form.hederaPrivateKey && form.evmPrivateKey

  return (
    <section className="space-y-6">
      <div className="bg-[#181818] p-8 kinetic-border relative overflow-hidden">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="font-headline text-2xl font-bold uppercase tracking-tight">Identity Linking</h2>
            <p className="text-zinc-500 text-sm mt-1">Bind your EVM and Hedera identities to the protocol.</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {/* EVM Wallet Card */}
          <div className="bg-[#111111] p-6 kinetic-border hover:border-[#E8201A]/50 transition-colors group">
            <div className="flex justify-between items-start mb-6">
              <div className="w-10 h-10 bg-zinc-900 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-[#E8201A]" />
              </div>
              {form.walletAddress ? (
                <span className="bg-green-500/10 text-green-500 font-sans text-[10px] px-2 py-0.5 uppercase flex items-center rounded-2xl gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Connected
                </span>
              ) : (
                <span className="bg-zinc-800 text-zinc-500 font-sans text-[10px] px-2 py-0.5 uppercase flex items-center rounded-2xl gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600"></span> Awaiting
                </span>
              )}
            </div>
            <h3 className="font-sans font-bold text-sm uppercase mb-1">EVM WALLET (METAMASK)</h3>
            <p className="font-sans text-xs text-zinc-500 truncate mb-4">{form.walletAddress || 'NOT_CONNECTED'}</p>
            {form.walletAddress ? (
              <button 
                onClick={() => setForm(f => ({ ...f, walletAddress: '' }))}
                className="w-full border border-zinc-800 py-3 font-sans text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-all duration-300 rounded-full hover:scale-105 hover:shadow-[0_0_20px_rgba(232,32,26,0.1)]"
              >
                DISCONNECT
              </button>
            ) : (
              <button 
                onClick={connectMetaMask}
                disabled={connecting}
                className="w-full bg-[#E8201A] text-white py-3 font-sans font-bold uppercase tracking-widest text-[10px] signature-glow disabled:opacity-50 rounded-full hover:scale-105 hover:shadow-[0_0_30px_rgba(232,32,26,0.4)] transition-all duration-300"
              >
                {connecting ? 'CONNECTING...' : 'CONNECT METAMASK'}
              </button>
            )}
          </div>
          {/* Hedera Account Card */}
          <div className="bg-[#111111] p-6 kinetic-border border-dashed hover:border-[#E8201A]/50 transition-colors">
            <div className="flex justify-between items-start mb-6">
              <div className="w-10 h-10 bg-zinc-900 flex items-center justify-center">
                <Cloud className="w-5 h-5 text-zinc-600" />
              </div>
              <span className="bg-zinc-800 text-zinc-500 font-sans text-[10px] px-2 py-0.5 uppercase flex items-center rounded-2xl gap-1">
                <span className="w-1.5 h-1. rounded-full bg-zinc-600"></span> Required
              </span>
            </div>
            <h3 className="font-sans font-bold text-sm uppercase mb-1">HEDERA ACCOUNT</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={form.hederaAccountId}
                onChange={(e) => setForm(f => ({ ...f, hederaAccountId: e.target.value }))}
                placeholder="0.0.12345"
                className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 font-sans text-xs text-white placeholder-zinc-600 outline-none focus:border-[#E8201A] transition-colors rounded-full hover:bg-[#1a1a1a] transition-all duration-300"
              />
              <input
                type="password"
                value={form.hederaPrivateKey}
                onChange={(e) => setForm(f => ({ ...f, hederaPrivateKey: e.target.value }))}
                placeholder="Hedera Private Key"
                className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 font-sans text-xs text-white placeholder-zinc-600 outline-none focus:border-[#E8201A] transition-colors rounded-full hover:bg-[#1a1a1a] transition-all duration-300"
              />
            </div>
          </div>
        </div>
        <div className="mt-6 bg-[#111111] p-4 kinetic-border">
          <h4 className="font-sans font-bold text-xs uppercase mb-2 text-zinc-400">EVM Private Key (for provider.js signing)</h4>
          <input
            type="password"
            value={form.evmPrivateKey}
            onChange={(e) => setForm(f => ({ ...f, evmPrivateKey: e.target.value }))}
            placeholder="0x4c..."
            className="w-full bg-zinc-900 border border-zinc-800 px-3 py-2 font-mono text-xs text-white placeholder-zinc-600 outline-none focus:border-[#E8201A] transition-colors rounded-full hover:bg-[#1a1a1a] transition-all duration-300"
          />
          <p className="text-[10px] text-zinc-600 mt-2">Keys are only written to your local config file — they never leave your machine.</p>
        </div>
      </div>
      <div className="flex justify-end">
        <button 
          onClick={onNext}
          disabled={!ready}
          className="bg-[#E8201A] text-white px-12 py-4 font-sans font-bold uppercase tracking-[0.2em] text-xs signature-glow active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-full hover:scale-105 hover:shadow-[0_0_40px_rgba(232,32,26,0.4)] duration-300"
        >
          PROCEED
        </button>
      </div>
    </section>
  )
}

// ─── Step 2: Network Configuration ────────────────────────────────────────────────

function Step2Network({ form, setForm, onNext, onBack }: { 
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  onNext: () => void
  onBack: () => void 
}) {
  const toggle = (t: string) =>
    setForm((f) => ({ ...f, taskTypes: f.taskTypes.includes(t) ? f.taskTypes.filter((x) => x !== t) : [...f.taskTypes, t] }))

  const ready = form.tasksTopic && form.taskTypes.length > 0

  return (
    <section className="space-y-6">
      <div className="bg-[#181818] p-8 kinetic-border">
        <h2 className="font-sans text-2xl font-bold uppercase tracking-tight mb-8">Network Configuration</h2>
        <div className="space-y-6">
          <div className="bg-[#111111] p-6 kinetic-border">
            <label className="font-sans font-bold text-xs uppercase text-zinc-400 mb-2 block">HCS Tasks Topic ID</label>
            <input
              type="text"
              value={form.tasksTopic}
              onChange={(e) => setForm(f => ({ ...f, tasksTopic: e.target.value }))}
              placeholder="0.0.8309839"
              className="w-full bg-zinc-900 border border-zinc-800 px-3 py-3 font-sans text-sm text-white placeholder-zinc-600 outline-none focus:border-[#E8201A] transition-colors rounded-full hover:bg-[#1a1a1a] transition-all duration-300"
            />
            <p className="text-[10px] text-zinc-600 mt-2">The Hedera Consensus Service topic your node listens on for new tasks.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-[#111111] p-6 kinetic-border">
              <label className="font-sans font-bold text-xs uppercase text-zinc-400 mb-2 block">Stake per task (HBAR)</label>
              <input
                type="number"
                min={1}
                max={1000}
                value={form.stakePerTask}
                onChange={(e) => setForm(f => ({ ...f, stakePerTask: Number(e.target.value) }))}
                className="w-full bg-zinc-900 border border-zinc-800 px-3 py-3 font-sans text-sm text-white outline-none focus:border-[#E8201A] transition-colors"
              />
            </div>
            <div className="bg-[#111111] p-6 kinetic-border">
              <label className="font-sans font-bold text-xs uppercase text-zinc-400 mb-2 block">Max concurrent tasks</label>
              <input
                type="number"
                min={1}
                max={10}
                value={form.maxConcurrentTasks}
                onChange={(e) => setForm(f => ({ ...f, maxConcurrentTasks: Number(e.target.value) }))}
                className="w-full bg-zinc-900 border border-zinc-800 px-3 py-3 font-sans text-sm text-white outline-none focus:border-[#E8201A] transition-colors"
              />
            </div>
          </div>
          <div className="bg-[#111111] p-6 kinetic-border">
            <label className="font-sans font-bold text-xs uppercase text-zinc-400 mb-2 block">Task types to accept</label>
            <div className="flex flex-wrap gap-2">
              {ALL_TASK_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => toggle(t)}
                  className={`px-4 py-2 font-sans text-[10px] uppercase tracking-wider border transition-all rounded-full hover:scale-105 ${
                    form.taskTypes.includes(t) 
                      ? 'bg-[#E8201A]/10 border-[#E8201A] text-[#E8201A]' 
                      : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <button 
          onClick={onBack}
          className="border border-zinc-800 px-8 py-4 font-sans font-bold uppercase tracking-[0.2em] text-xs hover:bg-zinc-900 transition-all duration-300 rounded-full hover:scale-105 hover:shadow-[0_0_20px_rgba(232,32,26,0.1)]"
        >
          BACK
        </button>
        <button 
          onClick={onNext}
          disabled={!ready}
          className="bg-[#E8201A] text-white px-12 py-4 font-sans font-bold uppercase tracking-[0.2em] text-xs signature-glow active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-full hover:scale-105 hover:shadow-[0_0_40px_rgba(232,32,26,0.4)] duration-300"
        >
          PROCEED
        </button>
      </div>
    </section>
  )
}

// ─── Step 3: Inference Configuration ─────────────────────────────────────────────

function Step3LLM({ form, setForm, onNext, onBack }: { 
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  onNext: () => void
  onBack: () => void 
}) {
  const [localModels, setLocalModels] = useState<string[]>([])

  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch('/api/ollama/models')
        const data = await res.json()
        if (data.models && data.models.length > 0) {
          setLocalModels(data.models)
          if (form.llmProvider === 'ollama') {
            setForm(f => ({ ...f, ollamaModel: data.models[0] }))
          }
        }
      } catch (e) {
        console.error("Failed to fetch local models", e)
      }
    }
    fetchModels()
  }, [])

  useEffect(() => {
    if (form.llmProvider === 'ollama') {
      if (localModels.length > 0) {
        setForm(f => ({ ...f, ollamaModel: localModels[0] }))
      }
    } else {
      setForm(f => ({ ...f, ollamaModel: MODELS[f.llmProvider][0] }))
    }
  }, [form.llmProvider, localModels])

  const ready = form.llmProvider === 'ollama' ? !!form.ollamaUrl
    : form.llmProvider === 'gemini' ? !!form.geminiApiKey
    : !!form.anthropicApiKey

  return (
    <section className="space-y-6">
      <div className="bg-[#181818] p-8 kinetic-border">
        <h2 className="font-sans text-2xl font-bold uppercase tracking-tight mb-8">Inference Configuration</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {/* Ollama */}
          <div 
            onClick={() => setForm(f => ({ ...f, llmProvider: 'ollama' }))}
            className={`bg-[#111111] p-6 kinetic-border relative cursor-pointer transition-all ${
              form.llmProvider === 'ollama' ? 'border-l-4 border-l-[#E8201A]' : 'hover:border-zinc-700'
            }`}
          >
            {form.llmProvider === 'ollama' && (
              <div className="absolute -left-[4px] top-1/2 -translate-y-1/2 w-2 h-8 bg-[#E8201A]"></div>
            )}
            <div className="flex items-center gap-3 mb-4">
              <Horse className={`w-6 h-6 ${form.llmProvider === 'ollama' ? 'text-[#E8201A]' : 'text-zinc-500'}`} />
              <span className="font-sans font-bold text-sm">OLLAMA</span>
            </div>
            {form.llmProvider === 'ollama' && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={form.ollamaUrl}
                  onChange={(e) => setForm(f => ({ ...f, ollamaUrl: e.target.value }))}
                  placeholder="http://localhost:11434"
                  className="w-full bg-zinc-900 border border-zinc-800 px-2 py-2 font-sans text-[10px] text-white placeholder-zinc-600 outline-none focus:border-[#E8201A] rounded-full hover:bg-[#1a1a1a] transition-all duration-300"
                />
                <div className="flex flex-wrap gap-1">
                  {(localModels.length > 0 ? localModels : MODELS.ollama).map((m) => (
                    <button
                      key={m}
                      onClick={(e) => { e.stopPropagation(); setForm(f => ({ ...f, ollamaModel: m })) }}
                      className={`px-2 py-1 font-sans text-[8px] uppercase border rounded-full transition-all hover:scale-105 ${
                        form.ollamaModel === m 
                          ? 'bg-[#E8201A]/20 border-[#E8201A] text-[#E8201A]' 
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Gemini */}
          <div 
            onClick={() => setForm(f => ({ ...f, llmProvider: 'gemini' }))}
            className={`bg-[#111111] p-6 kinetic-border cursor-pointer transition-all ${
              form.llmProvider === 'gemini' ? 'opacity-100' : 'opacity-60 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <Cloud className={`w-6 h-6 ${form.llmProvider === 'gemini' ? 'text-[#E8201A]' : 'text-zinc-500'}`} />
              <span className="font-sans font-bold text-sm">GEMINI</span>
            </div>
            {form.llmProvider === 'gemini' && (
              <div className="space-y-2">
                <input
                  type="password"
                  value={form.geminiApiKey}
                  onChange={(e) => setForm(f => ({ ...f, geminiApiKey: e.target.value }))}
                  placeholder="AIza..."
                  className="w-full bg-zinc-900 border border-zinc-800 px-2 py-2 font-sans text-[10px] text-white placeholder-zinc-600 outline-none focus:border-[#E8201A] rounded-full hover:bg-[#1a1a1a] transition-all duration-300"
                />
                <div className="flex flex-wrap gap-1">
                  {MODELS.gemini.map((m) => (
                    <button
                      key={m}
                      onClick={(e) => { e.stopPropagation(); setForm(f => ({ ...f, ollamaModel: m })) }}
                      className={`px-2 py-1 font-sans text-[8px] uppercase border rounded-full transition-all hover:scale-105 ${
                        form.ollamaModel === m 
                          ? 'bg-[#E8201A]/20 border-[#E8201A] text-[#E8201A]' 
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Claude */}
          <div 
            onClick={() => setForm(f => ({ ...f, llmProvider: 'claude' }))}
            className={`bg-[#111111] p-6 kinetic-border cursor-pointer transition-all ${
              form.llmProvider === 'claude' ? 'opacity-100' : 'opacity-60 hover:border-zinc-700'
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <Brain className={`w-6 h-6 ${form.llmProvider === 'claude' ? 'text-[#E8201A]' : 'text-zinc-500'}`} />
              <span className="font-sans font-bold text-sm">CLAUDE</span>
            </div>
            {form.llmProvider === 'claude' && (
              <div className="space-y-2">
                <input
                  type="password"
                  value={form.anthropicApiKey}
                  onChange={(e) => setForm(f => ({ ...f, anthropicApiKey: e.target.value }))}
                  placeholder="sk-ant-..."
                  className="w-full bg-zinc-900 border border-zinc-800 px-2 py-2 font-sans text-[10px] text-white placeholder-zinc-600 outline-none focus:border-[#E8201A] rounded-full hover:bg-[#1a1a1a] transition-all duration-300"
                />
                <div className="flex flex-wrap gap-1">
                  {MODELS.claude.map((m) => (
                    <button
                      key={m}
                      onClick={(e) => { e.stopPropagation(); setForm(f => ({ ...f, ollamaModel: m })) }}
                      className={`px-2 py-1 font-sans text-[8px] uppercase border rounded-full transition-all hover:scale-105 ${
                        form.ollamaModel === m 
                          ? 'bg-[#E8201A]/20 border-[#E8201A] text-[#E8201A]' 
                          : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <button 
          onClick={onBack}
          className="border border-zinc-800 px-8 py-4 font-sans font-bold uppercase tracking-[0.2em] text-xs hover:bg-zinc-900 transition-all duration-300 rounded-full hover:scale-105 hover:shadow-[0_0_20px_rgba(232,32,26,0.1)]"
        >
          BACK
        </button>
        <button 
          onClick={onNext}
          disabled={!ready}
          className="bg-[#E8201A] text-white px-12 py-4 font-sans font-bold uppercase tracking-[0.2em] text-xs signature-glow active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed rounded-full hover:scale-105 hover:shadow-[0_0_40px_rgba(232,32,26,0.4)] duration-300"
        >
          PROCEED
        </button>
      </div>
    </section>
  )
}

// ─── Step 4: On-chain Registration ────────────────────────────────────────────────

function Step4Register({ form, setForm, contracts, onBack, onNext }: { 
  form: FormState
  setForm: React.Dispatch<React.SetStateAction<FormState>>
  contracts: any
  onBack: () => void
  onNext: (txHash: string, agentId: string, info: ProviderInfo | null) => void 
}) {
  const [txStatus, setTxStatus] = useState<TxStatus>('idle')
  const [txHash, setTxHash] = useState('')
  const [error, setError] = useState('')

  async function register() {
    if (!form.evmPrivateKey) {
      setError('EVM private key is required (entered in Step 1).')
      return
    }
    setError('')
    setTxStatus('pending')

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evmPrivateKey: form.evmPrivateKey,
          registrationStake: form.registrationStake,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      setTxHash(data.txHash)
      setTxStatus('success')
      onNext(data.txHash, data.hcsAgentId, data.providerInfo ?? null)
    } catch (err: any) {
      setTxStatus('error')
      setError(err.message || 'Transaction failed.')
    }
  }

  const statusMap: Record<TxStatus, { label: string; color: string; icon: React.ReactNode }> = {
    idle: { label: 'Ready to register', color: 'text-zinc-400', icon: <Circle className="w-5 h-5" /> },
    switching_chain: { label: 'Connecting', color: 'text-yellow-500', icon: <ArrowClockwise className="w-5 h-5 animate-spin" /> },
    pending: { label: 'Submitting transaction to Hedera', color: 'text-yellow-500', icon: <ArrowClockwise className="w-5 h-5 animate-spin" /> },
    confirming: { label: 'Confirming on Hedera', color: 'text-yellow-500', icon: <ArrowClockwise className="w-5 h-5 animate-spin" /> },
    success: { label: 'Registered successfully', color: 'text-green-500', icon: <CheckCircle className="w-5 h-5" weight="fill" /> },
    error: { label: 'Transaction failed', color: 'text-red-500', icon: <XCircle className="w-5 h-5" weight="fill" /> },
  }

  const st = statusMap[txStatus]
  const isLoading = txStatus === 'pending' || txStatus === 'confirming'

  return (
    <section className="space-y-6">
      <div className="bg-[#181818] p-8 kinetic-border">
        <h2 className="font-sans text-2xl font-bold uppercase tracking-tight mb-8">On-chain Broadcast</h2>
        <div className="space-y-4">
          <div className="bg-[#111111] p-6 kinetic-border">
            <label className="font-sans font-bold text-xs uppercase text-zinc-400 mb-2 block">Registration stake (HBAR) - minimum 1</label>
            <input
              type="number"
              min={1}
              max={10000}
              value={form.registrationStake}
              disabled={isLoading}
              onChange={(e) => setForm(f => ({ ...f, registrationStake: Number(e.target.value) }))}
              className="w-full bg-zinc-900 border border-zinc-800 px-3 py-3 font-sans text-sm text-white outline-none focus:border-[#E8201A] transition-colors disabled:opacity-50 rounded-full hover:bg-[#1a1a1a] transition-all duration-300"
            />
            <p className="text-[10px] text-zinc-600 mt-2">
              Your EVM private key (from Step 1) signs this transaction directly via the Hedera JSON-RPC endpoint.
            </p>
          </div>

          <div className="bg-[#111111] p-6 kinetic-border space-y-3">
            <p className="font-sans font-bold text-xs uppercase text-zinc-400">Contract details</p>
            <div className="space-y-2 text-xs font-sans">
              <div className="flex justify-between">
                <span className="text-zinc-600">ProviderRegistry</span>
                <span className="text-zinc-400">{contracts.providerRegistry?.slice(0, 10)}...{contracts.providerRegistry?.slice(-8)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">Network</span>
                <span className="text-zinc-400">Hedera Testnet (chain 296)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">Function</span>
                <span className="text-[#E8201A]">register(bytes32, string)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">Initial reputation</span>
                <span className="text-zinc-400">50 / 100</span>
              </div>
            </div>
          </div>

          <div className="bg-[#111111] p-6 kinetic-border">
            <div className="flex items-center gap-3 mb-4">
              <span className={st.color}>{st.icon}</span>
              <span className={`text-sm font-medium ${st.color}`}>{st.label}</span>
            </div>

            {txHash && (
              <div className="bg-zinc-900 p-3 mb-3">
                <p className="text-[10px] text-zinc-600 mb-1">Transaction hash</p>
                <a
                  href={`https://hashscan.io/testnet/transaction/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-sans text-[#E8201A] hover:underline break-all"
                >
                  {txHash}
                </a>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 p-4 mt-2 rounded-2xl hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] transition-all duration-300">
                <p className="text-xs text-red-500">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {txStatus !== 'success' && (
        <div className="flex justify-between items-center">
          <button 
            onClick={onBack}
            className="border border-zinc-800 px-8 py-4 font-sans font-bold uppercase tracking-[0.2em] text-xs hover:bg-zinc-900 transition-all duration-300 rounded-full hover:scale-105 hover:shadow-[0_0_20px_rgba(232,32,26,0.1)]"
          >
            BACK
          </button>
          <button 
            onClick={register}
            disabled={isLoading}
            className="bg-[#E8201A] text-white px-12 py-4 font-sans font-bold uppercase tracking-[0.2em] rounded-full text-xs signature-glow active:scale-95 transition-all disabled:opacity-50"
          >
            {isLoading ? 'REGISTERING...' : 'REGISTER ON HEDERA'}
          </button>
        </div>
      )}
    </section>
  )
}

// ─── Step 5: Deployment Manifest ──────────────────────────────────────────────

function Step5Config({ form, txHash, agentId, providerInfo, contracts }: { 
  form: FormState
  txHash: string
  agentId: string
  providerInfo: ProviderInfo | null
  contracts: any
}) {
  const [copied, setCopied] = useState<string | null>(null)

  const configJson = JSON.stringify({
    protocol: 'proofclaw_v1',
    provider: {
      evm: form.walletAddress,
      hedera: form.hederaAccountId,
      engine: form.llmProvider,
      model: form.ollamaModel,
    },
    security: {
      layer: 'Neural_Network',
      encryption: 'AES_256_GCM',
    },
    hederaAccountId: form.hederaAccountId || '0.0.xxxxx',
    hederaPrivateKey: form.hederaPrivateKey || '302e',
    ethereumPrivateKey: form.evmPrivateKey || '0x',
    taskEscrowAddress: contracts.taskEscrow || '0x',
    tasksTopic: form.tasksTopic || '0.0.xxxxx',
    stakePerTask: form.stakePerTask,
    maxConcurrentTasks: form.maxConcurrentTasks,
    taskTypes: form.taskTypes,
    llmProvider: form.llmProvider,
    ...(form.llmProvider === 'ollama'
      ? { ollamaUrl: form.ollamaUrl, ollamaModel: form.ollamaModel }
      : form.llmProvider === 'gemini' ? { geminiApiKey: form.geminiApiKey }
      : { anthropicApiKey: form.anthropicApiKey }),
  }, null, 2)

  const envLocal = [
    `# PROOFCLAW_NODE_ENV`,
    `PRIVATE_KEY="${form.evmPrivateKey}"`,
    `PROVIDER_ID="P_NODE_${form.walletAddress?.slice(-4) || '0000'}"`,
    `NETWORK_TYPE="MAINNET"`,
    `HEDERA_ACCOUNT_ID="${form.hederaAccountId}"`,
    `HEDERA_PRIVATE_KEY="${form.hederaPrivateKey}"`,
    `OLLAMA_ENDPOINT="${form.ollamaUrl}"`,
  ].join('\n')

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  function download(text: string, filename: string) {
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([text], { type: 'text/plain' })),
      download: filename,
    })
    a.click()
  }

  return (
    <section className="space-y-6">
      <div className="bg-[#181818] p-8 kinetic-border">
        <div className="flex justify-between items-center mb-8">
          <h2 className="font-sans text-2xl font-bold uppercase tracking-tight">Deployment Manifest</h2>
          <button 
            onClick={() => download(configJson, 'config.json')}
            className="flex items-center gap-2 bg-[#E8201A] text-white font-sans font-bold uppercase px-4 py-2 text-[10px] tracking-widest signature-glow rounded-full hover:scale-105 hover:shadow-[0_0_20px_rgba(232,32,26,0.3)] transition-all duration-300"
          >
            <DownloadSimple className="w-4 h-4" /> DOWNLOAD_BUNDLE
          </button>
        </div>

        <div className="bg-[#111111] p-6 kinetic-border mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 bg-green-500 animate-pulse"></span>
            <p className="font-sans font-bold text-sm uppercase text-green-500">Registration confirmed</p>
          </div>
          <div className="space-y-2 text-xs font-sans">
            <div className="flex justify-between py-2 border-b border-zinc-800">
              <span className="text-zinc-600">Wallet</span>
              <span className="text-zinc-400">{form.walletAddress ? `${form.walletAddress.slice(0, 10)}...${form.walletAddress.slice(-8)}` : '—'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-zinc-800">
              <span className="text-zinc-600">HCS Agent ID</span>
              <span className="text-zinc-400">{agentId ? `${agentId.slice(0, 12)}...${agentId.slice(-10)}` : '—'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-zinc-800">
              <span className="text-zinc-600">Tx hash</span>
              <a href={`https://hashscan.io/testnet/transaction/${txHash}`} target="_blank" rel="noopener noreferrer" className="text-[#E8201A] hover:underline">{txHash ? `${txHash.slice(0, 12)}...${txHash.slice(-10)}` : '—'}</a>
            </div>
            {providerInfo && (
              <>
                <div className="flex justify-between py-2 border-b border-zinc-800">
                  <span className="text-zinc-600">Staked HBAR</span>
                  <span className="text-zinc-400">{providerInfo.stakedHBAR}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-zinc-800">
                  <span className="text-zinc-600">Reputation</span>
                  <span className="text-zinc-400">{providerInfo.reputationScore}</span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-sans text-[10px] uppercase text-zinc-500">config.json</span>
              <button onClick={() => copy(configJson, 'config')} className="text-zinc-500 hover:text-[#E8201A] transition-colors">
                {copied === 'config' ? <CheckIcon className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="bg-[#050505] p-4 kinetic-border h-48 overflow-y-auto">
              <pre className="font-sans text-[10px] text-zinc-400 leading-relaxed">{configJson}</pre>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-sans text-[10px] uppercase text-zinc-500">.env.local</span>
              <button onClick={() => copy(envLocal, 'env')} className="text-zinc-500 hover:text-[#E8201A] transition-colors">
                {copied === 'env' ? <CheckIcon className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div className="bg-[#050505] p-4 kinetic-border h-48 overflow-y-auto">
              <pre className="font-sans text-[10px] text-zinc-400 leading-relaxed">{envLocal}</pre>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#181818] p-8 kinetic-border space-y-8">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-sans font-black text-xs uppercase tracking-widest text-zinc-500">Method A: Docker (Zero-Install)</h3>
            <button onClick={() => copy(`docker run -d --name proofclaw-node -e PRIVATE_KEY=${form.evmPrivateKey} -e LLM=ollama proofclaw/node:latest`, 'docker')} className="text-zinc-500 hover:text-blue-400 transition-colors">
              {copied === 'docker' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="bg-[#050505] p-5 border border-white/5 rounded-xl font-mono text-[10px] text-blue-400 leading-relaxed shadow-inner">
            <code>docker run -d --name proofclaw-node \<br/>
            &nbsp;&nbsp;-e PRIVATE_KEY="{form.evmPrivateKey.slice(0, 8)}..." \<br/>
            &nbsp;&nbsp;-e LLM="ollama" \<br/>
            &nbsp;&nbsp;proofclaw/node:latest</code>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-sans font-black text-xs uppercase tracking-widest text-zinc-500">Method B: Local Development (NPM)</h3>
            <button onClick={() => copy('npm run provider', 'cmd')} className="text-zinc-500 hover:text-[#E8201A] transition-colors">
              {copied === 'cmd' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <pre className="text-xs font-sans text-green-500 bg-[#050505] p-6 rounded-xl border border-white/5 leading-relaxed shadow-inner">
{`# Place config.json in openclaw-skill/
# Place .env.local in project root
npm install && npm run provider`}
          </pre>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Link href="/dashboard">
          <button className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 font-sans font-bold uppercase tracking-[0.2em] text-xs transition-all rounded-full hover:scale-105 hover:shadow-[0_0_30px_rgba(34,197,94,0.4)] duration-300">
            GO TO DASHBOARD
          </button>
        </Link>
      </div>
    </section>
  )
}
