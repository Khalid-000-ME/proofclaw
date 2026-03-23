'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Space_Mono, Space_Grotesk, Instrument_Serif } from 'next/font/google'
import { Navbar } from '@/components/Navbar'
import { Sidebar } from '@/components/layout/Sidebar'
import './globals.css'

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
  variable: '--font-mono',
})

const spaceGrotesk = Space_Grotesk({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-sans',
})

const instrumentSerif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-instrument',
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isElectron, setIsElectron] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    if (typeof window !== 'undefined' && ('electron' in window || navigator.userAgent.toLowerCase().includes(' electron/'))) {
      setIsElectron(true)
    }
  }, [])

  const isLanding = pathname === '/'

  return (
    <html lang="en" className={`${spaceMono.variable} ${spaceGrotesk.variable} ${instrumentSerif.variable}`}>
       <body className="bg-[#0a0a0a] text-white font-sans min-h-screen overflow-hidden">
        <div className="flex h-screen w-screen border border-white/5 overflow-hidden">
           {/* In Electron we show the Sidebar instead of Top Navbar, except on Landing where we show neither */}
           {!isLanding && (
             isElectron ? (
                <Sidebar />
             ) : (
                <Navbar />
             )
           )}
           
           <div className="flex-1 overflow-y-auto relative bg-[#0a0a0a]">
              {/* Traffic light spacer for macOS in Electron */}
              {isElectron && <div className="h-8 w-full sticky top-0 z-[100] pointer-events-none" />}
              
              <main className={`${isElectron ? 'p-0' : 'pt-20'}`}>
                 {children}
              </main>
           </div>
        </div>
      </body>
    </html>
  )
}
