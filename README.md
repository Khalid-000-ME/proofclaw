# ProofClaw: The Mining Network for AI Agents

**Turn your idle compute into HBAR by providing verifiable proof for the agent economy.**

---

## 🏔️ The Story

Right now, millions of AI agents are running the world's tasks — writing code, analyzing data, scoring risk, and classifying content. But there is a massive hidden flaw: **Every single one of them is trusting a single API endpoint blindly.** They pay, and they hope. There is no way to know if the result was a cheap hallucination, stale data, or a flat-out fabrication.

Meanwhile, your laptop or that Raspberry Pi sitting on your desk is idle 60% of the day. It has untapped compute that nobody is using.

**ProofClaw connects these two facts.** 

By downloading a single installer and hitting "Start," your machine joins a decentralized network of verified providers. When an AI agent needs a task done, your machine runs it in the background, commits a result hash to Hedera, and compares it against the network. When you agree with the honest majority — and you will, because you're running the same model — you earn HBAR automatically.

The agent doesn't get a promise; they get a **Cryptographic Receipt.** A consensus-verified answer. A proof.

**You are not building infrastructure. You are turning idle silicon into income.**

---

### 🏗️ Overall Architecture

```text
                                     _________________________________________
                                    |                                         |
         [ AI AGENTS ]              |        HEDERA HASHGRAPH NETWORK         |
      (The Requesters)              |_________________________________________|
               |                                ^                  ^
               | 1. Fund Task                   |                  |
               v                                | 2. Post Task     | 5. Submit Hashes
    +-----------------------+                   |    Payload       |    & Reveal Results
    |   ProofClaw Market    |-------------------+                  |
    |  (Next.js Frontend)   |                   |                  |
    +-----------------------+                   |        __________|__________
               |                                |       |                     |
               |                                |       |   HCS TOPIC BUS     |
               |                                |       | (Immutable Ordering)|
               |                                |       |_____________________|
               |                                |                  ^
               |                                |                  | 4. Listen &
    +-----------------------+                   |                  |    Claim Task
    |   ProofClaw Desktop   |                   |                  |
    |     "THE MINER"       | <-----------------+------------------+
    | (Node Lifecycle Mgmt) |
    +-----------------------+          [ BACKGROUND MINER PROCESS ]
               |                    (Local Ollama / Remote AI Engines)
               |                                |
               +--------------------------------+
                                |
                        3. Local Inference
```

---

## ⚡ The Hedera Edge: Why ProofClaw?

ProofClaw is built to be **Hedera-Native**, leveraging the only network capable of handling high-throughput AI consensus at industrial scale:

### 1. HCS: The "Ground Truth" Bus
Unlike other networks where transaction ordering can be gamed, **Hedera Consensus Service (HCS)** provides fair, immutable timestamps. It acts as our decentralized backplane for broadcasting tasks and verifying submission order without any central server.

### 2. Scheduled Transactions: "Consensus-Locked" Payouts
Rewards are never held by a person. We use **Scheduled Transactions** to ensure that HBAR payouts are only triggered once the smart contract verifies that a majority of miners have successfully revealed the same answer. It’s trustless, automated settlement.

### 3. HTS: Reputation as an Asset
*   **PROOF Token (ERC-20)**: Every successful task "mined" earns you PROOF tokens natively on the **Hedera Token Service (HTS)**, building your on-chain reputation.
*   **Task Receipt NFT (ERC-721)**: The AI agent receives an NFT certificate — a permanent, verifiable record of the consensus achieved for their specific task.

---

## 📜 Mining Network Contracts

The network is governed by 6 core Solidity smart contracts, ensuring the "AI Mining" process is autonomous and secure:

| Contract | Purpose |
| :--- | :--- |
| **`ProviderRegistry`** | Manages miner registration and HBAR security staking. |
| **`TaskRegistry`** | The decentralized ledger of all pending and completed AI tasks. |
| **`TaskEscrow`** | Holds agent fees and miner bonds in trust until consensus. |
| **`TaskConsensus`** | The brain of the network; handles Commit-Reveal math and arbitration. |
| **`ProofToken`** | HTS-native reputation and mining reward token. |
| **`TaskReceiptNFT`** | Cryptographic proof-of-work certificates for the AI economy. |

---

## 🔄 The Protocol Sequence

```mermaid
sequenceDiagram
    autonumber
    participant A as AI Agent (Requester)
    participant HCS as Hedera Consensus Service
    participant SC as Smart Contracts (HSCS)
    participant M as Miner (Desktop Node)
    participant LLM as AI Engine (Ollama/LLM)

    Note over M: Miner stakes HBAR to join network
    
    A->>SC: 1. Create Task (Deposit HBAR Reward)
    SC-->>HCS: 2. Broadcast Task Request
    
    M->>HCS: 3. Watch for income opportunities
    M->>SC: 4. Lock Stake (Claim Task)
    
    M->>LLM: 5. Generate Evidence locally
    LLM-->>M: 6. Inference Result
    
    M->>M: 7. Cryptographic Hashing
    M->>SC: 8. COMMIT (Hidden Hash Submission)
    
    Note over SC: Wait for Min Miners or Deadline
    
    M->>HCS: 9. REVEAL (Publish Plaintext Result)
    SC->>SC: 10. Math Check & Consensus (67% Match)
    
    alt Consensus Reached
        SC->>SC: 11. Trigger Payout (Scheduled Tx)
        SC->>M: 12. Refund Stake + HBAR Reward + PROOF Token
        SC->>A: 13. Deliver Verified Result + NFT Receipt
    else Dissent/Failure
        SC->>SC: 14. Burn stake to Treasury
    end
```

---

## 🚀 Start Mining in Minutes

### Step 1: Download the Miner
Navigate to the `/downloads` page on ProofClaw.io and grab the **ProofClaw Desktop App** for Windows or Mac.

### Step 2: One-Click Setup
Follow the installer, enter your Hedera account ID and Private Key (stored only locally in your app's sandbox), and click **Start**.

### Step 3: Passive Income
Your machine will now sit in the background. When an agent on the network needs code verified or data classified, your node will "mine" the answer and deposit HBAR into your wallet automatically.

---

## 🛠️ Tech Stack
*   **Infrastructure**: Hedera Hashgraph (HCS, HTS, HSCS, Scheduled Txs)
*   **Miner UI**: Electron + Next.js 14
*   **AI Engine Support**: Ollama (Local LLMs), Claude/OpenAI (Hybrid)
*   **Consensus Logic**: Solidity 0.8.20

---

**Built on Hedera. Turning idle compute into a trusted tomorrow.**
