import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-ethers";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" }); // load .env.local first
dotenv.config({ override: false });    // fall back to .env for anything not already set

const evmKey = process.env.EVM_PRIVATE_KEY 
  ? (process.env.EVM_PRIVATE_KEY.startsWith("0x") ? process.env.EVM_PRIVATE_KEY : "0x" + process.env.EVM_PRIVATE_KEY)
  : undefined;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "cancun",
      viaIR: true,
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    hederaTestnet: {
      url: "https://testnet.hashio.io/api",
      chainId: 296,
      accounts: evmKey ? [evmKey] : [],
      gasPrice: 10_000_000_000, // 100 tinybars (1 tinybar = 100M wei on Hedera)
      gas: 4_000_000,           // explicit gas limit — skip estimateGas
    },
    hederaMainnet: {
      url: "https://mainnet.hashio.io/api",
      chainId: 295,
      accounts: evmKey ? [evmKey] : [],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
