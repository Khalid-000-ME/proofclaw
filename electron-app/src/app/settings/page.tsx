'use client'

import { useState, useEffect } from 'react'
import { 
  Gear, 
  Cpu, 
  Cloud, 
  Key, 
  Hash, 
  Browsers, 
  CheckCircle, 
  FloppyDisk,
  ArrowClockwise,
  Robot,
  WarningCircle,
  Eye,
  EyeSlash
} from '@phosphor-icons/react'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showTokens, setShowTokens] = useState(false)
  const [success, setSuccess] = useState(false)
  
  const [config, setConfig] = useState({
    llmProvider: 'ollama',
    ollamaModel: 'qwen3:4b',
    ollamaUrl: 'http://localhost:11434',
    tasksTopic: '0.0.8309839',
    hederaAccountId: '',
    hederaPrivateKey: '',
    evmPrivateKey: '',
    anthropicApiKey: '',
    geminiApiKey: ''
  })

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/config/settings')
        if (res.ok) {
          const data = await res.json()
          setConfig(prev => ({ ...prev, ...data }))
        }
      } catch (e) {
        console.error('Failed to load settings', e)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  async function handleSave() {
    setSaving(true)
    setSuccess(false)
    try {
      const res = await fetch('/api/config/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      if (res.ok) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch (e) {
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (key: string, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center font-mono text-[10px] text-zinc-600 uppercase tracking-widest">
      <ArrowClockwise className="animate-spin mr-2" /> Initializing_Vault...
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-[#E8201A] selection:text-white">
      <div className="[background-image:radial-gradient(#1f1f1f_1px,transparent_1px)] [background-size:24px_24px] min-h-screen pt-32 pb-20 px-10">
        <div className="max-w-[1000px] mx-auto">
          
          <header className="mb-14 flex items-end justify-between border-b border-white/5 pb-10">
            <div>
              <div className="flex items-center gap-2 mb-3 text-[#E8201A]">
                 <Gear size={20} weight="fill" />
                 <span className="font-mono text-[10px] uppercase tracking-[0.4em] font-black">System Preferences</span>
              </div>
              <h1 className="text-5xl font-black uppercase tracking-tighter">Configuration Matrix</h1>
              <p className="mt-4 text-zinc-500 font-mono text-[10px] uppercase max-w-md leading-relaxed">Identity, network parameters, and inference engine orchestration for the ProofClaw protocol.</p>
            </div>
            
            <button 
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-3 px-10 py-4 rounded-full font-sans font-black uppercase text-xs tracking-widest transition-all ${success ? 'bg-green-600' : 'bg-[#E8201A] hover:bg-red-600'} disabled:opacity-40 shadow-[0_0_40px_rgba(232,32,26,0.1)] active:scale-95`}
            >
              {saving ? <ArrowClockwise className="animate-spin" /> : success ? <CheckCircle weight="bold" /> : <FloppyDisk weight="bold" />}
              {saving ? 'Saving...' : success ? 'Vault_Updated' : 'Synchronize_Vault'}
            </button>
          </header>

          <main className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            <div className="lg:col-span-12 space-y-12">
              
              {/* Inference Engine Section */}
              <section className="bg-[#111111] border border-white/5 rounded-3xl p-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                   <Robot size={150} weight="fill" className="text-white" />
                </div>
                
                <h3 className="font-sans font-black text-xs uppercase mb-8 tracking-widest text-[#E8201A] flex items-center gap-2">
                  <Cpu size={18} /> Hardware Orchestration
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  {[
                    { id: 'ollama', name: 'Ollama', desc: 'Local Isolation', icon: Cpu },
                    { id: 'gemini', name: 'Gemini', desc: 'Google Cloud', icon: Cloud },
                    { id: 'claude', name: 'Claude', desc: 'Anthropic AI', icon: Cloud },
                    { id: 'openclaw', name: 'OpenClaw', desc: 'Sovereign API', icon: Browsers }
                  ].map((engine) => (
                    <button
                      key={engine.id}
                      onClick={() => handleChange('llmProvider', engine.id)}
                      className={`p-6 rounded-2xl border transition-all text-left flex flex-col gap-3 group/engine ${
                        config.llmProvider === engine.id 
                          ? 'bg-[#E8201A]/5 border-[#E8201A] shadow-[0_0_20px_rgba(232,32,26,0.1)]' 
                          : 'bg-black/20 border-white/5 hover:border-white/10 hover:bg-black/40'
                      }`}
                    >
                      <engine.icon size={24} className={config.llmProvider === engine.id ? 'text-[#E8201A]' : 'text-zinc-600 group-hover/engine:text-zinc-400'} />
                      <div>
                        <p className="font-sans font-black text-xs uppercase text-white">{engine.name}</p>
                        <p className="font-mono text-[9px] text-zinc-500 uppercase">{engine.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {config.llmProvider === 'ollama' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="space-y-2">
                      <label className="font-mono text-[9px] text-zinc-500 uppercase px-1">Ollama_Host_Address</label>
                      <input 
                        type="text" 
                        value={config.ollamaUrl} 
                        onChange={(e) => handleChange('ollamaUrl', e.target.value)}
                        className="w-full bg-black/60 border border-white/5 rounded-xl px-4 py-4 font-mono text-sm focus:outline-none focus:border-[#E8201A] transition-all" 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="font-mono text-[9px] text-zinc-500 uppercase px-1">Inference_Model_Tag</label>
                      <input 
                        type="text" 
                        value={config.ollamaModel} 
                        onChange={(e) => handleChange('ollamaModel', e.target.value)}
                        className="w-full bg-black/60 border border-white/5 rounded-xl px-4 py-4 font-mono text-sm focus:outline-none focus:border-[#E8201A] transition-all placeholder:text-zinc-700" 
                        placeholder="e.g. qwen2.5:4b"
                      />
                    </div>
                  </div>
                )}

                {['gemini', 'claude'].includes(config.llmProvider) && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-500">
                    <label className="font-mono text-[9px] text-zinc-500 uppercase px-1">Cloud_API_Key (Stored Encrypted)</label>
                    <div className="relative">
                      <input 
                        type={showTokens ? 'text' : 'password'} 
                        value={config.llmProvider === 'gemini' ? config.geminiApiKey : config.anthropicApiKey} 
                        onChange={(e) => handleChange(config.llmProvider === 'gemini' ? 'geminiApiKey' : 'anthropicApiKey', e.target.value)}
                        className="w-full bg-black/60 border border-white/5 rounded-xl pl-12 pr-4 py-4 font-mono text-sm focus:outline-none focus:border-[#E8201A] transition-all" 
                      />
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700" />
                    </div>
                  </div>
                )}
              </section>

              {/* Protocol Section */}
              <section className="bg-[#111111] border border-white/5 rounded-3xl p-10">
                <h3 className="font-sans font-black text-xs uppercase mb-8 tracking-widest text-[#E8201A] flex items-center gap-2">
                  <Hash size={18} /> Network Parameters
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="font-mono text-[9px] text-zinc-500 uppercase px-1">HCS_Broadcast_Topic</label>
                    <input 
                      type="text" 
                      value={config.tasksTopic} 
                      onChange={(e) => handleChange('tasksTopic', e.target.value)}
                      className="w-full bg-black/60 border border-white/5 rounded-xl px-4 py-4 font-mono text-sm focus:outline-none focus:border-[#E8201A] transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-mono text-[9px] text-zinc-500 uppercase px-1">Mirror_Node_API</label>
                    <input 
                      type="text" 
                      disabled 
                      value="https://testnet.mirrornode.hedera.com" 
                      className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-4 font-mono text-sm text-zinc-500" 
                    />
                  </div>
                </div>
              </section>

              {/* Security Section */}
              <section className="bg-[#111111] border border-white/5 rounded-3xl p-10">
                <div className="flex items-center justify-between mb-8">
                   <h3 className="font-sans font-black text-xs uppercase tracking-widest text-[#E8201A] flex items-center gap-2">
                    <Key size={18} /> Private_Identity_Keys
                  </h3>
                  <button 
                    onClick={() => setShowTokens(!showTokens)}
                    className="flex items-center gap-2 font-mono text-[9px] text-zinc-500 uppercase hover:text-white transition-colors"
                  >
                    {showTokens ? <><EyeSlash size={14} /> Hide Secret Fragments</> : <><Eye size={14} /> Reveal Secret Fragments</>}
                  </button>
                </div>

                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="font-mono text-[9px] text-zinc-500 uppercase px-1">Hedera_Account_ID</label>
                      <input 
                        type="text" 
                        value={config.hederaAccountId} 
                        onChange={(e) => handleChange('hederaAccountId', e.target.value)}
                        className="w-full bg-black/60 border border-white/5 rounded-xl px-4 py-4 font-mono text-sm focus:outline-none focus:border-[#E8201A] transition-all" 
                        placeholder="0.0.X"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="font-mono text-[9px] text-zinc-500 uppercase px-1 flex items-center gap-2">
                        Hedera_ED25519_Secret
                        <WarningCircle className="text-zinc-700" size={14} />
                      </label>
                      <input 
                        type={showTokens ? 'text' : 'password'} 
                        value={config.hederaPrivateKey} 
                        onChange={(e) => handleChange('hederaPrivateKey', e.target.value)}
                        className="w-full bg-black/60 border border-white/5 rounded-xl px-4 py-4 font-mono text-sm focus:outline-none focus:border-[#E8201A] transition-all" 
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="font-mono text-[9px] text-zinc-500 uppercase px-1">EVM_ECDSA_Identity_Secret (For Staking)</label>
                    <input 
                      type={showTokens ? 'text' : 'password'} 
                      value={config.evmPrivateKey} 
                      onChange={(e) => handleChange('evmPrivateKey', e.target.value)}
                      className="w-full bg-black/60 border border-white/5 rounded-xl px-4 py-4 font-mono text-sm focus:outline-none focus:border-[#E8201A] transition-all" 
                    />
                  </div>
                </div>
              </section>

            </div>
          </main>
          
          <footer className="mt-12 py-10 border-t border-white/5 flex items-center justify-between">
             <div className="flex items-center gap-4 text-zinc-600 font-mono text-[9px] uppercase tracking-widest">
                <span className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-green-500" /> All_Connections_Secure</span>
                <span className="flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-blue-500" /> AES-256_Encryption_Enabled</span>
             </div>
             <p className="font-mono text-[10px] text-zinc-800">VAULT_VERSION_1.0</p>
          </footer>

        </div>
      </div>
    </div>
  )
}
