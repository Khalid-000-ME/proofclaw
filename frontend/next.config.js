/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
  },
  env: {
    NEXT_PUBLIC_HEDERA_NETWORK: process.env.HEDERA_NETWORK || 'testnet',
    NEXT_PUBLIC_TASKS_TOPIC: process.env.TASKS_TOPIC || '',
    NEXT_PUBLIC_SETTLEMENTS_TOPIC: process.env.SETTLEMENTS_TOPIC || '',
  },
}

module.exports = nextConfig
