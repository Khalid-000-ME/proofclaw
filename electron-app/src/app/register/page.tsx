'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShieldCheck, Cloud, Cpu, ArrowClockwise, LockKey, Circle, CheckCircle, Wallet, Horse } from '@phosphor-icons/react'
import { getApiUrl } from '@/lib/constants'

// ─── Constants ────────────────────────────────────────────────────────────────
const MODELS: Record<string, string[]> = {
  ollama: ['llama3:8b', 'llama3.2:3b', 'llama3.1:8b', 'mistral:7b', 'phi3:mini', 'qwen2.5:4b'],
  gemini: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash'],
  claude: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
}

type Step = 1 | 2
type RegStatus = 'idle' | 'checking' | 'registering' | 'success' | 'error'

export default function RegisterWizard() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [regStatus, setRegStatus] = useState<RegStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [localOllamaModels, setLocalOllamaModels] = useState<string[]>([])

  const [form, setForm] = useState({
    hederaAccountId: '',
    hederaPrivateKey: '',
    evmPrivateKey: '',
    llmProvider: 'ollama',
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'qwen3:4b',
    geminiApiKey: '',
    anthropicApiKey: '',
  })

  // Load existing vault settings if any
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(getApiUrl('/api/config/settings'))
        if (res.ok) {
          const data = await res.json()
          setForm(prev => ({ ...prev, ...data, llmProvider: data.llmProvider || 'ollama' }))
        }
        
        // Load ollama local models
        const omRes = await fetch(getApiUrl('/api/ollama/models'))
        const omData = await omRes.json()
        if (omData.models?.length > 0) {
          setLocalOllamaModels(omData.models)
        }
      } catch (e) {
        console.error(e)
      }
    }
    load()
  }, [])

  const submitVault = async () => {
    if (!form.hederaAccountId || !form.hederaPrivateKey || !form.evmPrivateKey) {
      setErrorMsg('All Identity fields are required.')
      return
    }
    setErrorMsg('')
    setRegStatus('checking')
    setStep(2)

    try {
      // 1. Save to Vault
      const vaultRes = await fetch(getApiUrl('/api/config/settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, tasksTopic: '0.0.8309839' }) // Hardcoded Default Topic
      })

      if (!vaultRes.ok) throw new Error('Failed to save settings to vault.')

      // 2. Compute EVM Address to check if registered
      const { ethers } = await import('ethers')
      const walletAddress = new ethers.Wallet(form.evmPrivateKey).address

      const checkRes = await fetch(getApiUrl(`/api/providers?wallet=${walletAddress}`))
      const checkData = await checkRes.json()

      if (checkData.providers && checkData.providers.length > 0 && checkData.providers[0].isActive) {
        // Already registered on-chain
        setRegStatus('success')
        setTimeout(() => router.push('/dashboard'), 1500)
        return
      }

      // 3. Not registered -> Trigger On-chain Registration
      setRegStatus('registering')
      
      const regRes = await fetch(getApiUrl('/api/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evmPrivateKey: form.evmPrivateKey,
          registrationStake: 1
        })
      })

      const regData = await regRes.json()

      if (!regRes.ok) {
        if (regData.error === 'This address is already registered as a provider.') {
           setRegStatus('success')
           setTimeout(() => router.push('/dashboard'), 1500)
           return
        }
        throw new Error(regData.error || 'Registration failed.')
      }

      setRegStatus('success')
      setTimeout(() => router.push('/dashboard'), 1500)

    } catch (e: any) {
      setRegStatus('error')
      setErrorMsg(e.message)
    }
  }

  const getLLMModels = () => {
    if (form.llmProvider === 'ollama') return localOllamaModels.length > 0 ? localOllamaModels : MODELS.ollama
    return MODELS[form.llmProvider] || []
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-[#E8201A] selection:text-white pb-20 pt-16 px-6">
      <div className="max-w-3xl mx-auto space-y-12">
        <header className="border-l-4 border-[#E8201A] pl-8">
          <h1 className="font-sans text-4xl font-black tracking-tighter uppercase mb-1">Protocol Configuration</h1>
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">Provider Configuration & Security Vault</p>
        </header>

        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex items-center gap-4 text-red-500 font-mono text-xs uppercase tracking-widest">
                <Circle weight="fill" /> {errorMsg}
              </div>
            )}

            {/* Identites Vault */}
            <div className="bg-[#111111] p-8 rounded-3xl border border-white/5 space-y-6 shadow-2xl shadow-black/50">
              <h3 className="font-sans font-black text-sm uppercase tracking-widest text-[#E8201A] flex items-center gap-3">
                <LockKey size={20} /> Identity Vault (Local Only)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="font-mono text-[10px] text-zinc-500 uppercase px-1">Hedera Account ID</label>
                  <input 
                    type="text" 
                    value={form.hederaAccountId} 
                    onChange={e => setForm({...form, hederaAccountId: e.target.value})}
                    placeholder="0.0.X"
                    className="w-full bg-black/60 border border-white/5 rounded-xl px-4 py-4 font-mono text-sm focus:outline-none focus:border-[#E8201A] transition-all" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-mono text-[10px] text-zinc-500 uppercase px-1">Hedera Private Key</label>
                  <input 
                    type="password" 
                    value={form.hederaPrivateKey} 
                    onChange={e => setForm({...form, hederaPrivateKey: e.target.value})}
                    className="w-full bg-black/60 border border-white/5 rounded-xl px-4 py-4 font-mono text-sm focus:outline-none focus:border-[#E8201A] transition-all" 
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="font-mono text-[10px] text-zinc-500 uppercase px-1">EVM Private Key (Staking Identity)</label>
                  <input 
                    type="password" 
                    value={form.evmPrivateKey} 
                    onChange={e => setForm({...form, evmPrivateKey: e.target.value})}
                    className="w-full bg-black/60 border border-white/5 rounded-xl px-4 py-4 font-mono text-sm focus:outline-none focus:border-[#E8201A] transition-all" 
                  />
                </div>
              </div>
            </div>

            {/* Inference Engine */}
            <div className="bg-[#111111] p-8 rounded-3xl border border-white/5 space-y-6 shadow-2xl shadow-black/50">
              <h3 className="font-sans font-black text-sm uppercase tracking-widest text-[#E8201A] flex items-center gap-3">
                <Cpu size={20} /> Inference Engine
              </h3>
              
              <div className="flex flex-wrap gap-4 mb-4">
                {['ollama', 'gemini', 'claude'].map(prov => (
                  <button 
                    key={prov}
                    onClick={() => setForm({...form, llmProvider: prov, ollamaModel: prov === 'ollama' && localOllamaModels.length > 0 ? localOllamaModels[0] : MODELS[prov][0] })}
                    className={`flex items-center gap-2 px-6 py-3 rounded-full font-sans font-black text-xs uppercase transition-all border ${form.llmProvider === prov ? 'bg-[#E8201A]/10 border-[#E8201A] text-[#E8201A]' : 'bg-black/40 border-white/5 text-zinc-500 hover:text-white'}`}
                  >
                    {prov === 'ollama' ? <Horse size={16}/> : <Cloud size={16}/>} {prov}
                  </button>
                ))}
              </div>

              {form.llmProvider === 'ollama' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                  <div className="space-y-2">
                    <label className="font-mono text-[10px] text-zinc-500 uppercase px-1">Host Address</label>
                    <input 
                      type="text" 
                      value={form.ollamaUrl} 
                      onChange={e => setForm({...form, ollamaUrl: e.target.value})}
                      className="w-full bg-black/60 border border-white/5 rounded-xl px-4 py-4 font-mono text-sm focus:outline-none focus:border-[#E8201A] transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                     <label className="font-mono text-[10px] text-zinc-500 uppercase px-1">Model Tag</label>
                     <select 
                        value={form.ollamaModel}
                        onChange={e => setForm({...form, ollamaModel: e.target.value})}
                        className="w-full bg-black/60 border border-white/5 rounded-xl px-4 py-4 font-mono text-sm focus:outline-none focus:border-[#E8201A] transition-all appearance-none"
                     >
                       {getLLMModels().map((m: string) => <option key={m} value={m}>{m}</option>)}
                     </select>
                  </div>
                </div>
              )}

              {['gemini', 'claude'].includes(form.llmProvider) && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  <div className="space-y-2">
                    <label className="font-mono text-[10px] text-zinc-500 uppercase px-1">Cloud API Key</label>
                    <input 
                      type="password" 
                      value={form.llmProvider === 'gemini' ? form.geminiApiKey : form.anthropicApiKey} 
                      onChange={e => setForm({...form, [form.llmProvider === 'gemini' ? 'geminiApiKey' : 'anthropicApiKey']: e.target.value})}
                      className="w-full bg-black/60 border border-white/5 rounded-xl px-4 py-4 font-mono text-sm focus:outline-none focus:border-[#E8201A] transition-all" 
                    />
                  </div>
                  <div className="flex gap-2 flex-wrap">
                     {getLLMModels().map((m: string) => (
                        <button 
                          key={m}
                          onClick={() => setForm({...form, ollamaModel: m})} // We reuse ollamaModel variable internally for selected model tag
                          className={`px-4 py-2 font-mono text-[10px] uppercase rounded-full border transition-all ${form.ollamaModel === m ? 'bg-white/10 border-white text-white' : 'bg-transparent border-white/10 text-zinc-500'}`}
                        >{m}</button>
                     ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-6">
              <button 
                onClick={submitVault}
                className="bg-[#E8201A] text-white px-12 py-5 rounded-full font-sans font-black uppercase tracking-[0.2em] shadow-[0_0_40px_rgba(232,32,26,0.2)] hover:shadow-[0_0_60px_rgba(232,32,26,0.4)] hover:scale-105 active:scale-95 transition-all text-sm"
              >
                Secure Environment & Proceed →
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-[#111111] p-12 rounded-3xl border border-white/5 flex flex-col items-center justify-center text-center space-y-8 animate-in zoom-in-95 duration-500">
            {regStatus === 'checking' && (
               <>
                 <ArrowClockwise weight="bold" className="text-[#E8201A] animate-spin text-6xl" />
                 <div>
                    <h2 className="font-sans text-2xl font-black uppercase mb-2">Analyzing Consensus Registry</h2>
                    <p className="font-mono text-xs uppercase text-zinc-500 max-w-sm mx-auto">Evaluating on-chain profile and securely hashing deployment manifest...</p>
                 </div>
               </>
            )}
            
            {regStatus === 'registering' && (
               <>
                 <ShieldCheck weight="fill" className="text-yellow-500 animate-pulse text-6xl" />
                 <div>
                    <h2 className="font-sans text-2xl font-black uppercase mb-2">Committing Node Stake</h2>
                    <p className="font-mono text-xs uppercase text-zinc-500 max-w-sm mx-auto">Broadcasting Registration to Hedera Smart Contracts. This requires 1 HBAR stake baseline.</p>
                 </div>
               </>
            )}

            {regStatus === 'success' && (
               <>
                 <CheckCircle weight="fill" className="text-green-500 text-6xl" />
                 <div>
                    <h2 className="font-sans text-2xl font-black uppercase mb-2">Node Authorized</h2>
                    <p className="font-mono text-xs uppercase text-zinc-500 max-w-sm mx-auto">Hardware bound to Protocol. Routing to Dashboard...</p>
                 </div>
               </>
            )}

            {regStatus === 'error' && (
               <>
                 <Circle weight="fill" className="text-red-500 text-6xl" />
                 <div>
                    <h2 className="font-sans text-2xl font-black uppercase mb-2">Registration Fault</h2>
                    <p className="font-mono text-xs uppercase text-red-500/80 max-w-lg mx-auto mb-8 bg-red-500/10 p-4 rounded-xl border border-red-500/20">{errorMsg}</p>
                    <button onClick={() => {setStep(1); setRegStatus('idle'); setErrorMsg('')}} className="border border-white/20 px-8 py-3 rounded-full font-sans font-black text-xs uppercase hover:bg-white/10 transition-colors">
                      Return to Configuration
                    </button>
                 </div>
               </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
