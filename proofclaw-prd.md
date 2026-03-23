# PROOFCLAW — Product Requirements Document

> ProofClaw is a quality-staked AI task market on Hedera. When an OpenClaw agent pays for work via x402, it pays blind — x402 guarantees payment finality but provides zero recourse if the result is wrong, hallucinated, or deliberately falsified. ProofClaw fills this gap: providers stake HBAR on the correctness of every result they return. Disputes are arbitrated by a challenger network using HCS consensus ordering as the ground truth. Bad providers lose stake. Good providers earn task fees plus staking yield. The result is the first AI task market on Hedera where payment and quality are atomically linked.

---

| Field | Value |
|---|---|
| Track | AI & Agents — OpenClaw Bounty ($8K) |
| Bounty fit | "Killer App for the Agentic Society — app must demonstrate autonomous agent behaviour, create clear value in a multi-agent environment, agents must use Hedera EVM / Token Service / Consensus Service" |
| Network | Hedera Testnet (dev) / Mainnet (demo) |
| Version | 1.0 — Hackathon MVP |
| Hardware | Raspberry Pi 5 — live provider node during demo |
| Token Standards | ERC-20 HTS (PROOF staking token), ERC-721 HTS (task receipt) |
| Hedera Services | HSCS · HTS · HCS · Mirror Node · x402 |
| Agent Framework | OpenClaw (SOUL.md config, skills system) |

---

## Table of Contents

1. [The Problem — x402's Missing Layer](#1-the-problem--x402s-missing-layer)
2. [Core Insight](#2-core-insight)
3. [How ProofClaw Works — The Full Loop](#3-how-proofclaw-works--the-full-loop)
4. [Smart Contract Architecture](#4-smart-contract-architecture)
5. [HCS Task Lifecycle](#5-hcs-task-lifecycle)
6. [Staking and Slashing Economics](#6-staking-and-slashing-economics)
7. [OpenClaw Integration](#7-openclaw-integration)
8. [RPi 5 Provider Node Setup](#8-rpi-5-provider-node-setup)
9. [UI — Design System](#9-ui--design-system)
10. [UI — Page Structure](#10-ui--page-structure)
11. [UI — Dashboard Page](#11-ui--dashboard-page)
12. [UI — Task Market Page](#12-ui--task-market-page)
13. [UI — Provider Page](#13-ui--provider-page)
14. [UI — Dispute Page](#14-ui--dispute-page)
15. [UI — Landing Page](#15-ui--landing-page)
16. [Next.js Project Structure](#16-nextjs-project-structure)
17. [Component Inventory](#17-component-inventory)
18. [Hedera Services Integration](#18-hedera-services-integration)
19. [README Selling Points](#19-readme-selling-points)
20. [RPi Spin-Up Commands](#20-rpi-spin-up-commands)
21. [MVP Scope](#21-mvp-scope)
22. [Demo Script (5 min)](#22-demo-script-5-min)

---

## 1. The Problem — x402's Missing Layer

x402 is the HTTP-native payment protocol for AI agents on Hedera. An agent that needs a task completed sends an HTTP request. The server responds 402. The agent pays via HBAR or USDC-H. The server delivers the result. Payment is final.

**But payment finality is not result correctness.**

x402 verifies that HBAR moved from Agent A's wallet to Provider B's wallet. It does not verify that the inference result Provider B returned is accurate, non-hallucinated, or even relevant to the task. Once payment settles, Agent A has no recourse. Provider B can return garbage and keep the money.

This is not a hypothetical. It is the structural property of every pay-per-use AI API today:

- Agent calls a price prediction endpoint. Gets a confidently wrong answer. Loses $40K in a downstream trade.
- Agent calls a document classification service. Gets mislabelled results. Makes 10,000 incorrect downstream decisions.
- Agent calls a competitor intelligence service. Gets fabricated data. Executes a strategy built on fiction.

In each case, x402 settled perfectly. The payment was correct. The result was not. There is no on-chain record of what was promised. No stake at risk. No challenge mechanism. No arbitration. Payment and quality are completely decoupled.

**ProofClaw couples them.**

---

## 2. Core Insight

Every AI task that has a deterministic or near-deterministic correct answer can be verified by running it on multiple independent providers and comparing outputs.

If Provider A and Provider B both run the same classification task on the same input and return the same label — that agreement is evidence of correctness. Not proof in the cryptographic ZK sense. Evidence in the economic sense: two providers who staked HBAR on their answer both agree. The probability that both are wrong in the same direction is low. The probability that both fabricated the same wrong answer is lower. The cost of being wrong is stake loss.

This is the mechanism. Not ZK proofs (too expensive for every inference). Not TEEs (requires trusted hardware). Just **economic consensus between staked providers using HCS ordering as the arbitration clock**.

HCS is the right primitive because:
- It provides consensus-grade ordering — nobody can manipulate which result arrived "first"
- It timestamps every message immutably — the order of submissions is a permanent fact
- It costs $0.0001 per message — viable for every individual task result
- Mirror Node indexes all messages — any contract or agent can query the full task history

When two providers agree: both earn. When they disagree: a challenger network is invoked. The minority answer loses stake. The majority answer is delivered and paid. The entire arbitration is on-chain, permanent, and auditable.

---

## 3. How ProofClaw Works — The Full Loop

```
TASK REQUESTER (OpenClaw agent or any x402 client)
│
│  1. POST /task with x402 payment header
│     { taskType, input, minProviders: 2, stakeRequired: 10 HBAR }
│
▼
PROOFCLAW TASK ROUTER
│
│  2. Validates payment via x402 facilitator
│  3. Posts task to HCS topic: proofclaw.tasks
│     { taskId, taskType, inputHash, reward, deadline, minProviders }
│  4. Returns taskId to requester
│
▼
PROVIDER NETWORK (RPi nodes, cloud nodes, any staked provider)
│
│  5. Providers monitor HCS proofclaw.tasks topic via Mirror Node
│  6. Provider claims task by staking HBAR in TaskEscrow.sol
│  7. Provider runs inference locally (OpenClaw skill)
│  8. Provider posts result to HCS topic: proofclaw.results.{taskId}
│     { taskId, providerId, resultHash, signature, timestamp }
│
▼
CONSENSUS ENGINE (TaskConsensus.sol)
│
│  9. Waits for minProviders results OR deadline
│  10. Compares result hashes
│      - AGREEMENT (≥ 2/3 match): release payment to agreeing providers
│        slash stake of dissenting providers
│        post result to HCS proofclaw.settlements
│      - DISPUTE (no 2/3 majority): invoke challenger network
│        additional staked challengers vote
│        majority wins, minority slashed
│
▼
RESULT DELIVERY
│
│  11. Verified result delivered to requester via webhook / polling
│  12. ERC-721 task receipt NFT minted — contains taskId, resultHash,
│      consensus timestamp, provider IDs, agreement ratio
│  13. Requester can verify receipt independently via Mirror Node
```

---

## 4. Smart Contract Architecture

### 4.1 Contract Inventory (5 contracts)

| Contract | Role |
|---|---|
| `TaskRegistry.sol` | Creates tasks, stores task params, maps taskId → state |
| `TaskEscrow.sol` | Holds requester payment + provider stakes, releases on settlement |
| `TaskConsensus.sol` | Compares result hashes, determines agreement, triggers settlement |
| `ProviderRegistry.sol` | Registers providers, tracks stake, manages slash history, reputation score |
| `ProofToken.sol` | ERC-20 HTS staking token (PROOF), earned by providers for correct results |

### 4.2 TaskRegistry — Core Struct

```solidity
struct Task {
    bytes32  taskId;
    address  requester;
    TaskType taskType;         // CLASSIFICATION, EXTRACTION, SCORING, PREDICTION
    bytes32  inputHash;        // keccak256 of task input — stored off-chain, hash on-chain
    uint256  reward;           // HBAR reward, locked in TaskEscrow
    uint256  stakeRequired;    // HBAR each provider must stake to claim
    uint256  minProviders;     // minimum providers before consensus (default: 2)
    uint256  deadline;         // unix timestamp — HCS messages after this are ignored
    uint256  createdAt;
    bytes32  hcsTaskTopic;     // HCS topic ID for this task's results
    TaskState state;           // OPEN → CLAIMED → CONSENSUS → SETTLED → DISPUTED
    bytes32  consensusResult;  // winning resultHash after settlement
    uint256  agreementRatio;   // e.g. 8500 = 85% agreement
}

enum TaskType {
    CLASSIFICATION,    // label an input from a fixed set
    EXTRACTION,        // extract structured data from unstructured input
    SCORING,           // return a numeric score (0–100, risk score, etc.)
    PREDICTION,        // predict a future value or state
    VERIFICATION       // verify a claim: true / false
}
```

### 4.3 ProviderRegistry — Provider Struct

```solidity
struct Provider {
    address  providerAddress;
    bytes32  hcsAgentId;         // HOL registry agent ID
    uint256  stakedHBAR;         // total stake currently locked
    uint256  totalTasksCompleted;
    uint256  totalTasksSlashed;
    uint256  reputationScore;    // 0–10000 (10000 = perfect)
    uint256  proofTokensEarned;  // cumulative PROOF tokens
    bool     isActive;
    uint256  registeredAt;
}
```

### 4.4 Settlement Logic

```
On TaskConsensus.checkConsensus(taskId):

  results = all HCS messages on proofclaw.results.{taskId} before deadline
  group results by resultHash
  largestGroup = group with most providers

  if largestGroup.size / results.size >= CONSENSUS_THRESHOLD (0.67):
    → AGREEMENT
    agreeing providers: release stake + pay reward share + mint PROOF tokens
    dissenting providers: slash stake (50% to treasury, 50% to agreeing providers)
    mint ERC-721 task receipt to requester
    post settlement to HCS proofclaw.settlements

  else:
    → DISPUTE
    emit DisputeOpened(taskId)
    open 1-hour challenge window
    challenger providers stake and vote on correct answer
    majority wins, minority slashed
    settle with challenger consensus
```

### 4.5 ProofToken (PROOF) — ERC-20 HTS

```
Name     : ProofClaw Token
Symbol   : PROOF
Standard : ERC-20 HTS fungible
Decimals : 8
Minted   : Earned by providers on correct task completion
           Rate: 1 PROOF per correct task (flat, no inflation curve for MVP)
Use      : Provider reputation signal, future governance, staking multiplier
Burned   : Never (MVP) — accumulates as proof-of-work record
```

---

## 5. HCS Task Lifecycle

ProofClaw uses three HCS topics:

| Topic | Purpose | Writers | Readers |
|---|---|---|---|
| `proofclaw.tasks` | All new task postings | TaskRegistry contract | All providers, Mirror Node |
| `proofclaw.results.{taskId}` | Provider result submissions per task | Provider nodes | TaskConsensus contract |
| `proofclaw.settlements` | Settled task outcomes | TaskConsensus contract | Requesters, Dashboard UI |

### 5.1 Task Message Format (proofclaw.tasks)

```json
{
  "taskId": "0xabc123...",
  "taskType": "CLASSIFICATION",
  "inputHash": "0xdef456...",
  "inputEndpoint": "https://tasks.proofclaw.io/input/0xabc123",
  "reward": "5000000000",
  "stakeRequired": "1000000000",
  "minProviders": 2,
  "deadline": 1743753600,
  "createdAt": 1743750000,
  "requester": "0x3f...a912"
}
```

### 5.2 Result Message Format (proofclaw.results.{taskId})

```json
{
  "taskId": "0xabc123...",
  "providerId": "0x7a...c401",
  "resultHash": "0x9b2d...",
  "resultEndpoint": "https://providers.proofclaw.io/result/0x9b2d",
  "modelUsed": "claude-sonnet-4-6",
  "inferenceMs": 840,
  "signature": "0x...",
  "submittedAt": 1743751200
}
```

The `resultHash` is `keccak256(taskId + result + providerId + timestamp)`. Two providers agreeing means their `keccak256(taskId + result)` prefix matches — same answer, different provider metadata.

---

## 6. Staking and Slashing Economics

### 6.1 Staking Parameters

| Parameter | Value | Rationale |
|---|---|---|
| Minimum stake per task | 10 HBAR | Low barrier, meaningful skin-in-game |
| Slash on dissent | 50% of task stake | Painful enough to deter randomness |
| Slash destination | 25% treasury, 25% agreeing providers | Rewards correct providers directly |
| PROOF earned per correct task | 1 PROOF | Simple, predictable, accumulates as reputation |
| Consensus threshold | 67% | Standard supermajority |
| Dispute window | 60 minutes | Long enough for challengers to respond |
| Challenger stake | 2× task stake | Higher stake = higher confidence signal |

### 6.2 Provider Economics at Scale

```
Provider with 1,000 HBAR staked:
  Can claim 100 tasks simultaneously (10 HBAR each)
  Each task pays: reward share (avg 2.5 HBAR) + PROOF token
  Correct on 95% of tasks: earns 95 × 2.5 = 237.5 HBAR / batch
  Slashed on 5%: loses 5 × 5 = 25 HBAR stake
  Net per batch: +212.5 HBAR
  APY at 10 batches/day: ~750% on staked capital

This is the genuine on-chain yield source from real economic activity.
As agent task volume grows, provider yield grows with it.
```

### 6.3 Reputation Score Formula

```
reputationScore = (correctTasks × 10000) / (correctTasks + slashedTasks)
  weighted by recency: recent tasks count 2× older tasks
  displayed as 0–100 in UI

New providers start at 5000 (50/100) — neutral
Perfect record → 10000 (100/100)
One slash per 10 tasks → ~9091 (90.9/100)
```

---

## 7. OpenClaw Integration

### 7.1 ProofClaw as an OpenClaw Skill

ProofClaw ships as a native OpenClaw skill directory:

```
.agents/skills/proofclaw/
├── SKILL.md          # OpenClaw skill metadata and instructions
├── provider.js       # Provider node runtime — polls HCS, runs tasks, submits results
├── requester.js      # Task posting client — posts tasks to ProofClaw via x402
├── config.json       # Hedera account, stake amount, task types to accept
└── README.md         # Setup instructions
```

### 7.2 SKILL.md (abridged)

```markdown
# ProofClaw Provider Skill

Turns this OpenClaw agent into a staked provider node on the ProofClaw
quality-verified AI task market on Hedera.

## What this skill does
- Monitors HCS topic proofclaw.tasks for new tasks matching configured types
- Claims tasks by staking HBAR in TaskEscrow.sol
- Runs inference using configured LLM (Claude, GPT-4, local model)
- Posts result hash to HCS proofclaw.results.{taskId}
- Collects PROOF tokens and task rewards on correct results

## Configuration (config.json)
- hederaAccountId: your Hedera account ID
- hederaPrivateKey: your private key (stored locally, never sent)
- stakePerTask: HBAR to stake per task (default: 10)
- taskTypes: array of TaskType enums to accept
- maxConcurrentTasks: how many tasks to run simultaneously (default: 3)
- llmProvider: "claude" | "openai" | "local"

## Start
openclaw skills run proofclaw/provider
```

### 7.3 Agent-to-Agent Flow via x402

```
OpenClaw Agent A (requester) needs a document classified:

1. A's SOUL.md includes: "use ProofClaw for any classification task"
2. A calls proofclaw.requester.postTask(input, type: CLASSIFICATION)
3. ProofClaw router responds 402 with payment amount
4. A pays via x402 (HBAR micropayment)
5. ProofClaw posts task to HCS
6. OpenClaw Agent B (your RPi) sees task on HCS
7. B stakes 10 HBAR, runs classification, posts result hash
8. OpenClaw Agent C (another provider) does the same
9. Hashes match — consensus reached
10. A receives verified result + ERC-721 receipt NFT
11. B and C earn task reward + 1 PROOF token each
```

Every step is on-chain or HCS-anchored. The entire flow is auditable by anyone.

---

## 8. RPi 5 Provider Node Setup

### 8.1 What the RPi runs

- OpenClaw agent runtime (Node.js, already installable on RPi 5)
- ProofClaw provider skill
- HCS subscription listener via Mirror Node REST polling
- Local LLM inference (Ollama + Llama 3.2 3B for fast local classification)
  OR proxy to Claude API for higher-quality tasks
- Hedera SDK for signing and submitting transactions

### 8.2 Why the RPi matters for the pitch

The RPi is not a demo prop. It is a **live economic participant in the ProofClaw network during the demo**. While the judges are watching:
- The RPi is polling HCS for new tasks
- It stakes 10 HBAR to claim a task posted live by Account A
- It runs inference locally
- It posts its result to HCS
- The consensus engine agrees with the second provider
- The RPi earns HBAR and a PROOF token

This is what "agent-native application" means. Not a human using an interface. A device in the room, acting autonomously, earning money in real time.

---

## 9. UI — Design System

### 9.1 Core Aesthetic Direction

The reference dashboard image uses a dark, data-dense layout with strong color-coded data types (green = valid, orange = invalid/warning, white = neutral), big typography for KPIs, and timeline-style horizontal bar charts. ProofClaw inherits this language but recolors it to the OpenClaw brand.

**Tone:** Industrial monitoring tool meets crypto-native terminal. Not a consumer app. Not a DeFi dashboard. A network operations interface that happens to show you money moving.

**The one thing someone will remember:** The live task flow — tasks appearing in real time as HCS messages, being claimed, results streaming in, consensus lighting up green. It looks like a network packet analyzer, but every packet is an AI task being verified and settled.

### 9.2 Color Tokens

OpenClaw's brand is **space lobster** — deep black background, vivid red primary, with lobster-orange accents. ProofClaw extends this with semantic colors for task states:

```css
:root {
  /* Brand — OpenClaw origin */
  --color-bg:           #0a0a0a;   /* near-black — all backgrounds */
  --color-bg-2:         #111111;   /* panel backgrounds */
  --color-bg-3:         #1a1a1a;   /* input / card backgrounds */
  --color-red:          #E8201A;   /* primary — ProofClaw red */
  --color-red-dim:      #E8201A2A; /* red fills */
  --color-red-faint:    #E8201A0F; /* subtle red bg */
  --color-orange:       #FF6B2B;   /* secondary — lobster orange */
  --color-orange-dim:   #FF6B2B2A;

  /* Semantic — task states */
  --color-consensus:    #22C55E;   /* green — agreement reached */
  --color-consensus-dim:#22C55E1F;
  --color-pending:      #F59E0B;   /* amber — waiting for results */
  --color-pending-dim:  #F59E0B1F;
  --color-dispute:      #EF4444;   /* red — dispute open */
  --color-slashed:      #7C3AED;   /* purple — slashed */
  --color-slashed-dim:  #7C3AED1F;

  /* Text */
  --color-text-1:       #FFFFFF;   /* primary values */
  --color-text-2:       #A3A3A3;   /* secondary labels */
  --color-text-3:       #525252;   /* dimmed / disabled */
  --color-border:       #1F1F1F;   /* default border */
  --color-border-2:     #2A2A2A;   /* hover border */
  --color-border-red:   #E8201A44; /* red border accent */
}
```

### 9.3 Typography

```css
/* Headlines, KPI numbers, nav — Space Mono */
--font-mono: 'Space Mono', monospace;

/* Body, descriptions, labels, table data — DM Sans */
--font-sans: 'DM Sans', sans-serif;
```

**Usage rules:**
- All numbers (HBAR amounts, task counts, percentages, timestamps) → Space Mono
- All navigation items, section headings (uppercase, tracked) → Space Mono
- All body text, descriptions, table row labels, button text → DM Sans
- KPI display numbers → Space Mono, 48–64px, weight 700
- Section headers → Space Mono, 11px, weight 700, uppercase, 3px letter-spacing
- Card titles → DM Sans, 14px, weight 600
- Table data → DM Sans, 13px, weight 400

### 9.4 Icons

Phosphor Icons (React) — `@phosphor-icons/react`. No emoji anywhere.

| Usage | Icon |
|---|---|
| Task / job | `<Lightning />` |
| Provider node | `<CircuitBoard />` |
| Consensus / verified | `<Checks />` |
| Dispute | `<WarningOctagon />` |
| Staking | `<CurrencyDollar />` |
| Slashed | `<Knife />` |
| PROOF token | `<Hexagon />` |
| HCS / chain | `<LinkSimple />` |
| Dashboard | `<SquaresFour />` |
| Settings | `<Gear />` |
| Copy | `<Copy />` |
| External link | `<ArrowSquareOut />` |
| Pending / waiting | `<HourglassHigh />` |
| RPi node | `<Cpu />` |
| Connected | `<WifiHigh />` |

### 9.5 Component Rules

```
Borders        : 1px solid var(--color-border) on all containers
               : 1px solid var(--color-border-red) on active/selected cards
Border radius  : 8px on cards and panels
               : 6px on buttons and inputs
               : 4px on badges and pills
               : 0px on table rows

Shadows        : none — flat surfaces only

Buttons:
  Primary   : bg var(--color-red-dim)  border var(--color-red)  text var(--color-red)
  Secondary : bg var(--color-bg-3)     border var(--color-border-2)  text var(--color-text-2)
  Danger    : bg var(--color-slashed-dim) border var(--color-slashed)

Status badges:
  CONSENSUS : bg var(--color-consensus-dim) text var(--color-consensus) border var(--color-consensus)
  PENDING   : bg var(--color-pending-dim)   text var(--color-pending)   border var(--color-pending)
  DISPUTE   : bg var(--color-dispute)       text white                  (filled)
  SLASHED   : bg var(--color-slashed-dim)   text var(--color-slashed)   border var(--color-slashed)

Tables:
  Header    : DM Sans 11px uppercase letter-spacing-2 color-text-3 border-bottom color-border
  Row       : border-bottom color-border hover:bg color-bg-3
  No zebra striping

Grid decoration (landing page only):
  Dot grid  : radial-gradient(circle, #1F1F1F 1px, transparent 1px)
              background-size: 32px 32px
              pointer-events: none, position: fixed, z-index: -1
```

---

## 10. UI — Page Structure

### 10.1 Global Shell

```
┌──────────────────────────────────────────────────────────────────────┐
│  TOPBAR (56px)                                                        │
│  [PROOFCLAW]  [Dashboard][Market][Providers][Disputes]               │
│                               [Network: Hedera] [0x3f..] [Stake: 240]│
├────────────────┬─────────────────────────────────────────────────────┤
│                │                                                      │
│  SIDEBAR       │            MAIN CONTENT                             │
│  (220px)       │                                                      │
│                │  page-specific                                       │
│  Live Tasks    │                                                      │
│  My Node       │                                                      │
│  Earnings      │                                                      │
│  PROOF balance │                                                      │
│                │                                                      │
└────────────────┴─────────────────────────────────────────────────────┘
```

### 10.2 Page Inventory

| Page | Route | Purpose | MVP |
|---|---|---|---|
| Landing | `/` | Hero, protocol explanation, get-started | Yes |
| Dashboard | `/dashboard` | Network overview, live task feed, KPIs | Yes |
| Task Market | `/market` | Browse open tasks, post tasks, task history | Yes |
| My Node | `/node` | RPi provider status, earnings, claimed tasks | Yes |
| Disputes | `/disputes` | Open disputes, vote, slash history | Yes |
| Provider Registry | `/providers` | All registered providers, reputation scores | Yes |
| Task Detail | `/task/[id]` | Single task — result, consensus, receipt NFT | Yes |
| Docs | `/docs` | Setup guide, API reference | Yes |

---

## 11. UI — Dashboard Page

The dashboard is modelled on the reference image: big KPI cards at the top, a live timeline/activity feed on the right, and a data-dense chart panel at the bottom. Every number is live-polled from Mirror Node (HCS topic subscriptions + contract state).

### 11.1 KPI Row (top, 4 cards)

```
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  TASKS TODAY    │ │  CONSENSUS RATE │ │  ACTIVE NODES   │ │  HBAR STAKED    │
│                 │ │                 │ │                 │ │                 │
│  1,284          │ │  94.2%          │ │  38             │ │  48,200         │
│  +12% vs 24h   │ │  ↑ 0.4%        │ │  +3 online      │ │  +840 today     │
└─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘
```

- Font: Space Mono 48px for main value, DM Sans 13px for label and delta
- Delta arrows: green up arrow (Phosphor `<ArrowUp />`) or red down (`<ArrowDown />`)
- Cards: `border: 1px solid var(--color-border)`, `border-radius: 8px`
- "TASKS TODAY" card: left border `3px solid var(--color-red)` — primary highlight

### 11.2 Middle Row — Task Type Distribution + Live Timeline

Left panel (60%): **Task type distribution** — bubble chart like reference image:
- X-axis: time (last 24 hours)
- Y-axis: task types (CLASSIFICATION, EXTRACTION, SCORING, PREDICTION, VERIFICATION)
- Bubble size: task count
- Bubble color: consensus rate (green = high, amber = medium, red = disputed)
- Library: Recharts `ScatterChart`

Right panel (40%): **Live Task Feed** — vertical timeline like reference image:
```
LIVE TASKS                                           last updated 3s ago
──────────────────────────────────────────────────
14:32:04  CLASSIFICATION   task #4821   [CONSENSUS]   2 providers  2.4s
14:31:58  EXTRACTION       task #4820   [PENDING]     1/2 results  ...
14:31:44  SCORING          task #4819   [CONSENSUS]   3 providers  1.8s
14:31:39  PREDICTION       task #4818   [DISPUTE]     no consensus  ↗
14:31:22  VERIFICATION     task #4817   [CONSENSUS]   2 providers  3.1s
```
- Each row has a colored left-edge bar matching task state color
- Clicking any row navigates to `/task/[id]`
- Feed auto-scrolls, last 50 tasks shown, polled every 3s from Mirror Node

### 11.3 Bottom Row — Provider Leaderboard + Slash History

Left panel: **Top providers this week** — horizontal bar chart like reference image:
```
Provider          Tasks  Correct  Slashed  PROOF   Reputation
0x3f...a912       284    269      2        271     97.8
0x7a...c401       241    235      1        236     99.1  ← Your RPi
0x9d...b823       198    181      6        183     91.4
...
```

Right panel: **Network health metrics**:
- Consensus rate over last 7 days (line chart)
- Average result submission time (line chart)
- HBAR slashed per day (bar chart)

---

## 12. UI — Task Market Page

### 12.1 Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  TASK MARKET                                    [POST TASK]          │
│  Filter: [All Types ▼] [Any State ▼] [Sort: newest ▼]              │
├─────────────────────────────────────────────────────────────────────┤
│  Task table — all open, pending, settled tasks                      │
├─────────────────────────────────────────────────────────────────────┤
│  ID         Type           Reward    Stake   State       Providers  │
│  #4821      CLASSIFICATION 5 HBAR    10 HBAR CONSENSUS   2/2  ✓    │
│  #4820      EXTRACTION     8 HBAR    10 HBAR PENDING     1/2  ...  │
│  #4819      SCORING        3 HBAR    10 HBAR CONSENSUS   3/3  ✓    │
│  #4818      PREDICTION     12 HBAR   15 HBAR DISPUTE     —    ⚠    │
└─────────────────────────────────────────────────────────────────────┘
```

### 12.2 Post Task Panel (right drawer)

```
POST A TASK
────────────────────────────────
TASK TYPE
[Classification ▼]

INPUT
[Paste text or upload file]

REWARD (HBAR)
[5.00____________]

MIN PROVIDERS
[2__]

DEADLINE
[+30 minutes ▼]   [+1 hour] [+6 hours] [custom]

PAYMENT
via x402 — HBAR micropayment
estimated: 5.0 HBAR reward
           + 0.1 HBAR protocol fee

[POST TASK — 5.1 HBAR]
────────────────────────────────
Your task will appear on HCS
topic proofclaw.tasks within ~3s
```

### 12.3 Task Detail Page `/task/[id]`

```
TASK #4821                                         [CONSENSUS]  VERIFIED

Input hash         0xdef456...             [Copy] [View on Mirror Node ↗]
Task type          CLASSIFICATION
Reward             5 HBAR
Stake per provider 10 HBAR
Requester          0x3f...a912
Posted             14:31:22 UTC   HCS seq #: 1,284,432

RESULTS
────────────────────────────────────────────────────────────
Provider         Submitted    Result hash      Agreement   Earned
0x7a...c401      14:31:44     0x9b2d...        ✓ MATCH     2.5 HBAR + 1 PROOF
0x3f...b823      14:31:47     0x9b2d...        ✓ MATCH     2.5 HBAR + 1 PROOF
Agreement ratio  100%
Consensus time   2.4 seconds

RECEIPT NFT
────────────────────────────────────────────────────────────
Token ID         0.0.4821
Minted to        0x3f...a912
Contains         taskId · resultHash · consensusTimestamp · providerIds
[View NFT on HashScan ↗]

VERIFICATION
────────────────────────────────────────────────────────────
HCS settlement   proofclaw.settlements · seq #1,284,433  [View ↗]
Settlement TX    0xabc...123                              [View ↗]
```

---

## 13. UI — Provider Page (My Node)

This page is the RPi operator's control panel. It shows the live status of the connected OpenClaw provider node.

### 13.1 Layout

```
MY NODE                                          [Node: ONLINE]  [0x7a...c401]
────────────────────────────────────────────────────────────────────────────

NODE STATUS
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  STATUS          │ │  STAKED          │ │  PROOF BALANCE   │
│  ONLINE          │ │  240 HBAR        │ │  236 PROOF       │
│  RPi 5 · local   │ │  [Add stake]     │ │  [Claim rewards] │
└──────────────────┘ └──────────────────┘ └──────────────────┘

REPUTATION       97.8 / 100
[██████████████████████████████░░] 241/247 tasks correct

ACTIVE TASKS (3 running)
────────────────────────────────────────────────────────────
#4820  EXTRACTION   started 14s ago   result pending
#4815  SCORING      started 38s ago   result pending
#4811  CLASSIF.     started 62s ago   submitted ✓

EARNINGS THIS SESSION
────────────────────────────────────────────────────────────
Tasks completed:   47
HBAR earned:       117.5
HBAR staked:       240
PROOF earned:      47
Slashes:           0

TASK HISTORY (last 20)
────────────────────────────────────────────────────────────
#4817  VERIFICATION   CONSENSUS  +2.5 HBAR  +1 PROOF  3.1s
#4812  CLASSIFICATION CONSENSUS  +2.5 HBAR  +1 PROOF  1.8s
#4809  EXTRACTION     CONSENSUS  +4.0 HBAR  +1 PROOF  4.2s
#4803  PREDICTION     SLASHED    −5.0 HBAR   0 PROOF  —
...
```

### 13.2 Node Configuration Panel

```
NODE CONFIG
────────────────────────────────
Task types to accept:
[x] CLASSIFICATION   [x] EXTRACTION
[x] SCORING          [ ] PREDICTION
[x] VERIFICATION

LLM provider:    [Claude Sonnet ▼]
Max concurrent:  [3___________]
Stake per task:  [10__ HBAR]
Auto-restake:    [ON]

[SAVE CONFIG]
[RESTART NODE]
[VIEW LOGS]
```

---

## 14. UI — Dispute Page

### 14.1 Layout

```
DISPUTES                                         [2 open disputes]

OPEN DISPUTES
────────────────────────────────────────────────────────────────
Task #4818 — PREDICTION
Posted 14:31:39 · Dispute opened 14:33:02 · Closes in 47m 18s
Providers disagreed: 0x3f... → hash A · 0x7a... → hash B
Stake at risk: 30 HBAR total
[VIEW TASK] [CHALLENGE AS VALIDATOR]

────────────────────────────────────────────────────────────────

CHALLENGE PANEL (task #4818)
────────────────────────────────
You are staking 20 HBAR to vote.
Review both results and vote for
the correct one.

Result A (hash 0xa1b2...)  → [VOTE A]
Result B (hash 0xc3d4...)  → [VOTE B]

Current votes:
  A: 3 validators (60 HBAR)
  B: 1 validator  (20 HBAR)
────────────────────────────────

RESOLVED DISPUTES (last 10)
────────────────────────────────────────────────────────────────
#4801  CLASSIFICATION  A won (3/4 votes)  15 HBAR slashed  14:12:04
#4793  EXTRACTION      B won (4/4 votes)  20 HBAR slashed  13:58:22
...
```

---

## 15. UI — Landing Page

### 15.1 Design Intent

Big, confident, brutalist-minimal. Space Mono for all display text. DM Sans for body copy. Full-bleed black background with subtle dot grid texture. A single vivid red accent. No gradients except a faint red glow behind the hero headline. Sections flow top to bottom — no carousels, no tabs, no lazy load tricks.

### 15.2 Section Structure

```
SECTION 1 — HERO (full viewport height)
────────────────────────────────────────
[dot grid background]
[faint red radial glow behind headline]

  PROOFCLAW                               ← Space Mono 96px weight 700
  Quality-staked AI tasks                 ← Space Mono 48px weight 400 color-text-2
  on Hedera.                              ← same

  Agents pay. Providers stake.            ← DM Sans 20px color-text-2 max-width 560px
  Wrong answers get slashed.
  The network is the arbiter.

  [GET STARTED →]    [READ DOCS →]        ← buttons

  ┌──────────────────────────────────┐
  │  Live network stats (3s refresh) │
  │  Tasks today: 1,284              │
  │  Consensus rate: 94.2%           │
  │  Active nodes: 38                │
  │  HBAR staked: 48,200             │
  └──────────────────────────────────┘

────────────────────────────────────────
SECTION 2 — THE PROBLEM (text + icon grid)

  x402 settles payments.                  ← Space Mono 32px headline
  It doesn't settle correctness.

  [three problem cards in a row]
  ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
  │ <WarningOctagon> │ │ <Question>       │ │ <X>              │
  │ Wrong results    │ │ No recourse      │ │ Payment final    │
  │ paid in full     │ │ after payment    │ │ result is not    │
  └──────────────────┘ └──────────────────┘ └──────────────────┘

────────────────────────────────────────
SECTION 3 — HOW IT WORKS (step flow)

  Providers stake HBAR.                   ← Space Mono 32px
  Agreement earns. Dissent slashes.

  01 — Agent posts task via x402          ← Space Mono 11px uppercase label
       [description in DM Sans]

  02 — Providers stake + submit result
  03 — HCS ordering determines sequence
  04 — Consensus releases payment
  05 — Dispute? Challengers vote on-chain

────────────────────────────────────────
SECTION 4 — BUILT ON HEDERA (primitives)

  [four service cards]
  HCS — task ordering + arbitration
  HTS — PROOF token + task receipt NFT
  x402 — agent payment layer
  HSCS — escrow + settlement contracts

────────────────────────────────────────
SECTION 5 — RUN A NODE (terminal block)

  Spin up a provider in 3 commands.      ← Space Mono 32px

  [code block with dark terminal style]
  $ git clone ...
  $ npm run setup
  $ npm run provider

────────────────────────────────────────
SECTION 6 — FOOTER

  PROOFCLAW  ·  Built for Hedera Apex 2026
  [GitHub ↗]  [Docs ↗]  [HCS Explorer ↗]
```

---

## 16. Next.js Project Structure

```
proofclaw/
├── app/
│   ├── layout.tsx              # global shell, topbar, sidebar
│   ├── page.tsx                # landing page
│   ├── dashboard/
│   │   └── page.tsx            # network dashboard
│   ├── market/
│   │   ├── page.tsx            # task market
│   │   └── [id]/page.tsx       # task detail
│   ├── node/
│   │   └── page.tsx            # my provider node
│   ├── providers/
│   │   └── page.tsx            # provider registry
│   ├── disputes/
│   │   └── page.tsx            # disputes
│   └── docs/
│       └── page.tsx            # setup docs
│
├── components/
│   ├── layout/
│   │   ├── Topbar.tsx
│   │   ├── Sidebar.tsx
│   │   └── Shell.tsx
│   ├── dashboard/
│   │   ├── KPICard.tsx
│   │   ├── LiveTaskFeed.tsx
│   │   ├── TaskBubbleChart.tsx
│   │   └── ProviderLeaderboard.tsx
│   ├── market/
│   │   ├── TaskTable.tsx
│   │   ├── TaskRow.tsx
│   │   ├── PostTaskDrawer.tsx
│   │   └── TaskDetailView.tsx
│   ├── node/
│   │   ├── NodeStatusCard.tsx
│   │   ├── ReputationBar.tsx
│   │   ├── ActiveTaskList.tsx
│   │   └── EarningsPanel.tsx
│   ├── disputes/
│   │   ├── DisputeCard.tsx
│   │   └── ChallengePanel.tsx
│   └── shared/
│       ├── StatusBadge.tsx     # CONSENSUS / PENDING / DISPUTE / SLASHED
│       ├── HashDisplay.tsx     # 0x3f...a912 with copy button
│       ├── HCSLink.tsx         # link to Mirror Node / Hashscan
│       ├── ProofToken.tsx      # PROOF balance display
│       └── MonoNumber.tsx      # Space Mono number with unit
│
├── lib/
│   ├── hedera/
│   │   ├── client.ts           # Hedera SDK client setup
│   │   ├── hcs.ts              # HCS topic subscribe / publish
│   │   ├── hts.ts              # HTS token operations
│   │   └── mirror.ts           # Mirror Node REST queries
│   ├── contracts/
│   │   ├── TaskRegistry.ts     # contract call wrappers
│   │   ├── TaskEscrow.ts
│   │   ├── TaskConsensus.ts
│   │   └── ProviderRegistry.ts
│   ├── x402/
│   │   └── client.ts           # x402 payment client
│   └── openclaw/
│       └── skill-bridge.ts     # bridge between OpenClaw skill and ProofClaw API
│
├── contracts/
│   ├── TaskRegistry.sol
│   ├── TaskEscrow.sol
│   ├── TaskConsensus.sol
│   ├── ProviderRegistry.sol
│   └── ProofToken.sol
│
├── scripts/
│   ├── deploy.ts               # Hardhat deploy script
│   ├── seed-tasks.ts           # seed testnet with demo tasks
│   └── register-provider.ts   # register RPi as provider
│
├── openclaw-skill/
│   ├── SKILL.md
│   ├── provider.js             # HCS polling + inference + result posting
│   ├── requester.js            # task posting client
│   └── config.json
│
├── hardhat.config.ts
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 17. Component Inventory

### 17.1 `StatusBadge.tsx`

```tsx
type TaskState = 'OPEN' | 'PENDING' | 'CONSENSUS' | 'DISPUTE' | 'SLASHED'

// Renders colored pill with Phosphor icon
// CONSENSUS → green Checks icon
// PENDING   → amber HourglassHigh icon
// DISPUTE   → red WarningOctagon icon
// SLASHED   → purple Knife icon
// OPEN      → border-only, Lightning icon
```

### 17.2 `KPICard.tsx`

```tsx
interface KPICardProps {
  label: string           // "TASKS TODAY"
  value: string | number  // "1,284"
  delta?: string          // "+12% vs 24h"
  deltaDir?: 'up' | 'down'
  accent?: boolean        // left red border on primary card
}
// value in Space Mono 48px
// label in DM Sans 11px uppercase letter-spacing-2
// delta with ArrowUp / ArrowDown Phosphor icon
```

### 17.3 `LiveTaskFeed.tsx`

```tsx
// Polls Mirror Node HCS topic proofclaw.tasks + proofclaw.settlements
// every 3 seconds via useEffect + setInterval
// Renders vertical timeline, last 50 tasks
// Each row: timestamp | taskType | taskId | StatusBadge | providers | time
// Auto-scrolls to latest
// TaskType colored dot on left edge (matches dashboard chart colors)
```

### 17.4 `ReputationBar.tsx`

```tsx
// Renders reputation score as horizontal progress bar
// Space Mono number "97.8 / 100" on right
// Bar fill: green if > 90, amber if 70-90, red if < 70
// Subtext: "241/247 tasks correct" in DM Sans 12px color-text-3
```

### 17.5 `HashDisplay.tsx`

```tsx
// Truncates 0x3f...a912
// Copy button (Phosphor Copy icon) inline
// Optional external link to Hashscan (ArrowSquareOut icon)
// Space Mono 12px
```

---

## 18. Hedera Services Integration

| Service | Role | Why ProofClaw-native |
|---|---|---|
| **HCS** | Task posting, result submission, settlement log, dispute record | Consensus ordering IS the arbitration mechanism — nobody manipulates which result arrived first |
| **HTS** | PROOF token (ERC-20), task receipt NFT (ERC-721) | Network-level tokens — no ERC-20 contract footprint, KYC keys available |
| **HSCS** | 5 contracts — task lifecycle, escrow, consensus, provider registry | HTS precompile = token ops as syscalls, clean staking/slashing logic |
| **Mirror Node** | Real-time HCS topic queries, task feed, provider history | Replaces TheGraph entirely — free, indexed, REST |
| **x402** | Agent-to-ProofClaw payment — HTTP-native, no wallet UI | Agents pay as naturally as making an HTTP request |
| **HOL Registry** | Register providers as HOL agents — discoverable via HCS-10 | Free HOL bounty eligibility, agents discoverable by other A2A protocols |

### 18.1 x402 Integration Detail

```typescript
// ProofClaw task router — x402 middleware
import { createX402Handler } from '@hedera/x402'

app.post('/task', x402Handler({
  currency: 'HBAR',
  recipient: process.env.TREASURY_ACCOUNT,
  pricePerUnit: (req) => {
    const reward = req.body.reward || 5_000_000_000  // tinybars
    return reward + PROTOCOL_FEE                      // reward + 0.1 HBAR
  },
  unit: 'task'
}), async (req, res) => {
  // x402 confirmed payment — now post task to HCS
  const taskId = await taskRegistry.createTask(req.body)
  await hcsClient.publishToTopic(TASKS_TOPIC, { taskId, ...req.body })
  res.json({ taskId, hcsTopic: TASKS_TOPIC })
})
```

### 18.2 HCS Subscription (provider node)

```typescript
// provider.js — OpenClaw skill runtime
import { MirrorNodeClient } from '@hashgraph/sdk'

async function pollForTasks() {
  const messages = await mirrorNode.getTopicMessages(
    TASKS_TOPIC,
    { sequenceNumberGte: lastProcessedSeq }
  )
  for (const msg of messages) {
    const task = JSON.parse(msg.message)
    if (canAcceptTask(task)) {
      await claimTask(task.taskId)
      const result = await runInference(task)
      await submitResult(task.taskId, result)
    }
  }
}

setInterval(pollForTasks, 3000)  // poll every 3s — Hedera finality ~3s
```

---

## 19. README Selling Points

These are the exact selling points to include in the README and pitch description:

```
ProofClaw is the missing quality layer for AI agent commerce on Hedera.

x402 made it possible for agents to pay each other. ProofClaw makes
those payments worth something — by putting provider stake at risk on
every result they return.

WHAT MAKES IT NATIVE TO HEDERA

→ HCS consensus ordering is the arbitration mechanism. Nobody can
  manipulate which result arrived first. The network's ordering IS
  the ground truth.

→ Hedera's ~3s finality means task-to-settlement in under 10 seconds.
  On Ethereum, a dispute resolution round would take hours.

→ x402 on Hedera enables gasless micropayments from any AI agent —
  an OpenClaw agent on a Raspberry Pi can pay for and receive
  verified tasks with a single HTTP request.

→ HTS PROOF token accumulates as an on-chain work record — portable
  reputation that follows the provider across every protocol on Hedera.

→ ERC-721 task receipt NFTs give requesters a cryptographic record of
  what was agreed, when, by whom, and what the result was. Not just
  a payment receipt — a verified output receipt.

WHAT PROOFCLAW CREATES FOR THE ECOSYSTEM

→ The first quality-verification layer for x402 payments on Hedera
→ On-chain provider reputation — portable across all Hedera protocols
→ Genuine yield from real AI agent economic activity — not circular DeFi
→ A public task history on HCS — any protocol can index it
→ A staking market with economic incentives aligned to accuracy

HEDERA SERVICES USED

HCS   — task posting, result submission, settlement log (4 topics)
HTS   — PROOF token (ERC-20), task receipt (ERC-721)
HSCS  — 5 Solidity contracts (task lifecycle, escrow, consensus)
x402  — HTTP-native payment from any agent
Mirror Node — real-time task feed, provider history
HOL Registry — agent registration, A2A discoverability

STACK

Next.js 14 · TypeScript · @hashgraph/sdk · Solidity 0.8
Hardhat · Recharts · @phosphor-icons/react
Space Mono + DM Sans · Tailwind CSS · OpenClaw skills system
```

---

## 20. RPi Spin-Up Commands

The following commands go in the README under "Run a Provider Node on Raspberry Pi 5".

### 20.1 Prerequisites (one-time)

```bash
# On your RPi 5 — tested on Raspberry Pi OS 64-bit (Bookworm)
# Requires: Node.js 20+, npm 10+

# 1. Install Node.js 20 (if not installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# 2. Verify
node --version   # should print v20.x.x
npm --version    # should print 10.x.x

# 3. (Optional) Install Ollama for local inference
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama3.2:3b   # ~2GB — fast classification model for RPi
```

### 20.2 ProofClaw Provider Setup

```bash
# 4. Clone ProofClaw
git clone https://github.com/yourusername/proofclaw.git
cd proofclaw

# 5. Install dependencies
npm install

# 6. Configure environment
cp .env.example .env
nano .env
# Fill in:
#   HEDERA_ACCOUNT_ID=0.0.xxxxxx
#   HEDERA_PRIVATE_KEY=302e...
#   HEDERA_NETWORK=testnet
#   LLM_PROVIDER=ollama         # or "claude" / "openai"
#   OLLAMA_MODEL=llama3.2:3b    # if using local inference
#   STAKE_PER_TASK=10           # HBAR to stake per task

# 7. Register as a provider (one-time)
npm run register-provider
# Output:
#   Registered provider: 0x7a...c401
#   Staked: 100 HBAR (initial stake)
#   HOL Registry agent ID: 0.0.xxxxxx
#   HCS-10 endpoint: ready

# 8. Start the provider node
npm run provider
# Output:
#   ProofClaw Provider Node started
#   Account: 0x7a...c401
#   Monitoring HCS topic: 0.0.4851234
#   Stake per task: 10 HBAR
#   Task types: CLASSIFICATION, EXTRACTION, SCORING, VERIFICATION
#   LLM: ollama/llama3.2:3b
#   Polling interval: 3000ms
#   Waiting for tasks...
```

### 20.3 Full Stack (frontend + contracts + provider)

```bash
# Deploy contracts to testnet (once)
npm run deploy:testnet
# Output: contract addresses saved to .env.local

# Seed testnet with demo tasks (for demo day)
npm run seed-tasks
# Output: 10 tasks posted across all task types

# Start Next.js frontend
npm run dev
# Open http://localhost:3000

# Start provider node (separate terminal)
npm run provider

# Run everything with one command (uses concurrently)
npm run start:all
# Starts: Next.js dev server + provider node + HCS monitor
```

### 20.4 OpenClaw Skill Installation

```bash
# If you already have OpenClaw installed
cd ~/.openclaw
mkdir -p .agents/skills/proofclaw
cp -r /path/to/proofclaw/openclaw-skill/* .agents/skills/proofclaw/

# Start ProofClaw skill via OpenClaw
openclaw skills run proofclaw/provider

# Or add to your SOUL.md to auto-start:
# echo "skills: [proofclaw/provider]" >> .agents/main/SOUL.md
```

---

## 21. MVP Scope

### 21.1 In Scope — Hackathon Build

- [ ] TaskRegistry.sol — create / cancel tasks
- [ ] TaskEscrow.sol — requester payment + provider stake + release
- [ ] TaskConsensus.sol — hash comparison, settlement logic
- [ ] ProviderRegistry.sol — register, reputation, slash history
- [ ] ProofToken.sol — ERC-20 HTS, mint on correct result
- [ ] Task receipt ERC-721 HTS NFT minted on settlement
- [ ] HCS topics: tasks + results + settlements
- [ ] x402 integration for task posting
- [ ] OpenClaw provider skill (SKILL.md + provider.js)
- [ ] RPi live provider node (runs during demo)
- [ ] Next.js frontend — all 7 pages
- [ ] Live HCS feed on dashboard (Mirror Node polling)
- [ ] Landing page with live network stats
- [ ] HOL Registry agent registration (free bounty eligibility)
- [ ] Testnet deployment with demo seed tasks
- [ ] README with RPi setup in 3 commands

### 21.2 Out of Scope — V2

- Dispute challenger network (MVP shows disputes open but manual resolution)
- Multi-round arbitration
- Provider insurance pool
- PROOF token governance
- Cross-chain task posting (Ethereum agents posting to ProofClaw via bridge)
- Private tasks (encrypted inputs)
- Task result marketplace (selling verified outputs)
- Mobile layout

### 21.3 Risk & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| RPi inference too slow for demo | Medium | Demo risk | Pre-warm Ollama model, use Claude API as fallback |
| Two providers disagree in demo | Low | Demo risk | Seed demo tasks where both providers will agree (deterministic input) |
| x402 facilitator unavailable | Low | High | Use mock x402 payment for demo, real on testnet |
| HCS message delivery delay | Very Low | Low | 3s polling + 3s finality = ~6s max lag, acceptable for demo |
| Contract deployment failure | Low | High | Deploy and verify contracts day before demo, keep testnet state |

---

## 22. Demo Script (5 min)

### Setup

Three browser windows: Dashboard (`/dashboard`), Task Market (`/market`), My Node (`/node`). RPi 5 running `npm run provider` in terminal. Two Hedera testnet accounts: Account A (requester — laptop), Account B (provider — RPi). 5 demo tasks pre-seeded on testnet.

---

### Step 1 — Show the live network (30 sec)

Open Dashboard. Point at the live task feed scrolling in real time.

"Every row in this feed is an AI task posted to HCS and settled by provider consensus. No human triggered any of this. The network is running."

Point at consensus rate (94.2%). "94% of tasks resolve in under 10 seconds. The 6% that don't go to dispute — we'll show that too."

---

### Step 2 — Post a task (45 sec)

Account A opens Task Market, clicks POST TASK.

Selects: CLASSIFICATION, pastes a news headline, reward 5 HBAR, min providers 2.

Clicks POST TASK. x402 payment fires. Task appears in live feed within 3 seconds with status OPEN.

Open Hashscan. Show the x402 payment transaction. Show the HCS message on `proofclaw.tasks` topic. "Payment and task posting happened atomically. The task is now a public fact on Hedera."

---

### Step 3 — RPi claims and solves it (1 min)

Terminal on screen — RPi running `npm run provider`.

Watch the terminal: task detected, stake submitted, Ollama running inference locally, result hash posted to HCS.

"This is a Raspberry Pi 5 in this room. It just staked 10 HBAR on the correctness of its answer. If it's wrong, it loses that stake."

Show My Node page — active task count increased to 1, stake at risk shown.

Second provider (cloud node pre-running) also submits a result.

---

### Step 4 — Consensus fires (45 sec)

Task feed updates: PENDING → CONSENSUS. Green.

Click the task row. Task detail page shows:
- Both result hashes match
- Agreement ratio: 100%
- Settlement time: 4.1 seconds
- RPi earned: 2.5 HBAR + 1 PROOF token

Open Hashscan. Show the HCS settlement message on `proofclaw.settlements`. Show the ERC-721 receipt NFT minted to Account A.

"The network ordered the results. The hashes matched. Payment released. Receipt minted. The entire arbitration was on-chain. No human judged correctness. The providers staked on it. That stake alignment is the quality guarantee."

---

### Step 5 — The punchline (1 min)

Show RPi terminal — it has now processed 6 tasks in the background during the demo. Total earned: 15 HBAR + 6 PROOF tokens. Zero slashes.

Show My Node reputation: 100/100.

"While we've been talking, this Raspberry Pi has been autonomously earning HBAR by providing verified AI computation to the Hedera agent economy. It staked on every answer. It was right every time. It earned.

That's ProofClaw. x402 made agents able to pay. ProofClaw makes what they're paying for worth trusting."

---

*PROOFCLAW — PRD v1.0 — Hedera Hello Future Apex Hackathon 2026*
*AI & Agents Track + OpenClaw Bounty ($8K) + HOL Registry Bounty (eligible)*
*Contracts: 5 Solidity · Tokens: PROOF (ERC-20 HTS) · RECEIPT (ERC-721 HTS)*
*Services: HCS · HTS · HSCS · x402 · Mirror Node · HOL Registry*
*Stack: Next.js 14 · TypeScript · Space Mono · DM Sans · Phosphor Icons · Recharts*
*Hardware: Raspberry Pi 5 — live provider node*
