'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Gear, Wallet } from '@phosphor-icons/react'
import { useState, useEffect } from 'react'
import { Unbounded } from 'next/font/google'

const unbounded = Unbounded({ subsets: ['latin'], weight: ['900'] })

// TypeScript declaration for MetaMask
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>
      on: (event: string, handler: (accounts: string[]) => void) => void
      removeListener: (event: string, handler: (accounts: string[]) => void) => void
    }
  }
}

export function Navbar() {
  const pathname = usePathname()
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  const navLinks = [
    { href: '/', label: 'HOME', active: pathname === '/' },
    { href: '/dashboard', label: 'DASHBOARD', active: pathname === '/dashboard' },
    { href: '/register', label: 'REGISTER', active: pathname === '/register' },
    { href: '/task', label: 'TASK', active: pathname === '/task' },
    { href: '/providers', label: 'PROVIDERS', active: pathname === '/providers' },
    { href: '/market', label: 'MARKET', active: pathname === '/market' },
  ]

  // Check if wallet is already connected on mount
  useEffect(() => {
    checkConnection()
  }, [])

  const checkConnection = async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' })
        if (accounts.length > 0) {
          setWalletAddress(accounts[0])
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error)
      }
    }
  }

  const connectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('Please install MetaMask to connect your wallet')
      return
    }

    setIsConnecting(true)
    try {
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      })
      if (accounts.length > 0) {
        setWalletAddress(accounts[0])
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error)
      if (error.code === 4001) {
        // User rejected the request
        console.log('User rejected wallet connection')
      } else {
        alert('Failed to connect wallet. Please try again.')
      }
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = () => {
    setWalletAddress(null)
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent pt-2">
      <div className="max-w-[1920px] mx-auto">
        <div className="bg-[#111111] mx-4 mt-2 rounded-full border border-[#2A2A2A]/50 shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_30px_rgba(232,32,26,0.1)] transition-all duration-300">
          <div className="flex justify-between items-center px-6 py-3">
            {/* Logo */}
            <Link href="/" className="hover:scale-105 transition-transform duration-300">
              <div className="bg-white p-2 rounded-xl shadow-[0_0_15px_rgba(232,32,26,0.15)] flex flex-col items-center gap-1 w-12 h-12">
                <img src="/logo.png" alt="ProofClaw Logo" className="w-6 h-6 object-contain" />
                <span className={`text-[5px] font-black text-[#E8201A] tracking-tighter uppercase leading-none ${unbounded.className}`}>
                  PROOFCLAW
                </span>
              </div>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-xs font-sans tracking-widest uppercase transition-all duration-300 hover:scale-105 ${
                    link.active
                      ? 'text-[#E8201A] font-bold'
                      : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              
              {walletAddress ? (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-2 bg-[#181818] px-3 py-2 rounded-full border border-[#2A2A2A]/50">
                    <Wallet className="w-4 h-4 text-[#E8201A]" />
                    <span className="text-xs font-mono text-zinc-300">
                      {formatAddress(walletAddress)}
                    </span>
                  </div>
                  <button
                    onClick={disconnectWallet}
                    className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 font-sans font-bold uppercase text-xs tracking-widest rounded-full hover:scale-105 transition-all duration-300 active:scale-95"
                  >
                    DISCONNECT
                  </button>
                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  disabled={isConnecting}
                  className="bg-[#E8201A] text-white px-4 py-2 font-sans font-bold uppercase text-xs tracking-widest rounded-full hover:scale-105 hover:bg-red-600 hover:shadow-[0_0_20px_rgba(232,32,26,0.3)] transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isConnecting ? 'CONNECTING...' : 'CONNECT WALLET'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
