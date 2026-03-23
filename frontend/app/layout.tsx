import type { Metadata } from 'next'
import { Space_Mono, Space_Grotesk, Instrument_Serif } from 'next/font/google'
import { Navbar } from '@/components/Navbar'
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

export const metadata: Metadata = {
  title: 'ProofClaw — Quality-staked AI tasks on Hedera',
  description: 'ProofClaw is a quality-staked AI task market on Hedera. Providers stake HBAR on the correctness of every result they return.',
  icons: {
    icon: '/favicon.ico',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${spaceMono.variable} ${spaceGrotesk.variable} ${instrumentSerif.variable}`}>
      <body className="bg-[#0a0a0a] text-white font-sans min-h-screen">
        <Navbar />
        <main className="">
          {children}
        </main>
      </body>
    </html>
  )
}
