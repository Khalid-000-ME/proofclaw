# ProofClaw Desktop: The AI Miner GUI

**The official cross-platform desktop application for participating in the ProofClaw mining network.**

---

## 🏔️ Overview

The ProofClaw Desktop App is the bridge between your idle compute and the decentralized AI economy. It provides a premium, user-friendly interface for node operators (Miners) to manage their accounts, stake HBAR, and monitor real-time AI consensus tasks—all while running a high-performance background node.

### ⚙️ How it works
This application utilizes a tripartite architecture to ensure robustness and performance:
1.  **Electron Shell**: Manages native window operations, system tray integration, and secure credential sandboxing.
2.  **Next.js Internal Server**: Serves the rich provider dashboard locally (typically on port 4000) for sub-second UI responsiveness.
3.  **Forked Provider Node**: A dedicated Node.js child process that listens to the Hedera HCS Topic Bus, executes local AI inference (via Ollama or APIs), and handles cryptographic commit/reveal logic independently of the UI.

---

## 🛠️ Development

### Prerequisites
*   **Node.js v20+**
*   **Ollama** (Optional, for local-only mining)
*   **Hedera Testnet Account**

### Local Setup
1.  Navigate to the directory:
    ```bash
    cd electron-app
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Configure environment:
    ```bash
    cp .env.example .env.local
    # Ensure HEDERA_ACCOUNT_ID and HEDERA_PRIVATE_KEY are set
    ```

### Running in Dev Mode
This command launches the Next.js development server and the Electron shell simultaneously:
```bash
npm run electron:dev
```

---

## 📦 Building for Distribution

ProofClaw Desktop uses `electron-builder` to generate production-ready installers for Windows and macOS.

### For macOS (Arm64/Intel)
```bash
npm run electron:build
```
*   **Output**: `.dmg` and `.zip` in the `dist/` directory.

### For Windows (x64 NSIS)
```bash
npm run electron:build:win
```
*   **Output**: `.exe` (Setup) and unpacked directory in `dist/`.

### Multi-Platform Build
```bash
npm run electron:build:all
```

---

## 🏗️ Project Architecture

```
electron-app/
├── main.js           # Electron main process (Window & Process MGMT)
├── preload.js        # Secure IPC bridge for UI <-> System
├── src/
│   ├── app/          # Next.js Dashboard UI (Pages & Components)
│   ├── provider/     # The "Miner" Engine (HCS listener & Logic)
│   └── lib/          # Shared Hedera & Encryption utilities
└── public/           # Static assets for the Electron shell
```

---

## 🔒 Security
*   **Context Isolation**: UI code has ZERO direct access to Node.js APIs. Every system action is routed through a secure, type-safe IPC bridge (`preload.js`).
*   **Local-Only Keys**: Your private keys never leave your machine. They are used locally by the forked node process to sign Hedera transactions and are never transmitted to the ProofClaw registry.

---

**Built for the Hedera 2024 Hackathon. Powering the truth-machine for AI agents.**
