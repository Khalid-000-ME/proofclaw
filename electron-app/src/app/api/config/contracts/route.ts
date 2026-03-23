export const dynamic = "force-dynamic"
import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

function loadEnvForRoute() {
  dotenv.config({ path: path.join(process.cwd(), '.env.local') })
  dotenv.config({ path: path.join(process.cwd(), '.env') })
  dotenv.config({ path: path.join(process.cwd(), '..', '.env.local') })
  dotenv.config({ path: path.join(process.cwd(), '..', '.env') })
}

export async function GET() {
  try {
    loadEnvForRoute()
    const deploymentPath = path.join(process.cwd(), 'deployments', 'hederaTestnet.json')
    const deployment = fs.existsSync(deploymentPath)
      ? JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))
      : null

    return NextResponse.json({
      taskRegistry: process.env.TASK_REGISTRY_ADDRESS || deployment?.contracts?.TaskRegistry || '',
      taskEscrow: process.env.TASK_ESCROW_ADDRESS || deployment?.contracts?.TaskEscrow || '',
      providerRegistry: process.env.PROVIDER_REGISTRY_ADDRESS || deployment?.contracts?.ProviderRegistry || '',
      tasksTopic: process.env.TASKS_TOPIC || '0.0.8309839',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to load contract config' }, { status: 500 })
  }
}

