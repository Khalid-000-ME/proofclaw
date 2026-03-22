import pkg from "hardhat";
const { ethers } = pkg;
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ESM equivalent of __dirname (not available in ES modules by default)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider?.getBalance(deployer.address))?.toString());

  // Hedera requires an explicit gasPrice during eth_estimateGas; without it the
  // relay returns INSUFFICIENT_TX_FEE.  Supply fixed overrides for every tx.
  const TX_OVERRIDES = {
    gasLimit: 4_000_000,
    gasPrice: BigInt("1200000000000"), // 12,000 tinybars — above Hedera testnet minimum of 9,600
  };

  // Deploy TaskRegistry
  console.log("\nDeploying TaskRegistry...");
  const TaskRegistry = await ethers.getContractFactory("TaskRegistry");
  const taskRegistry = await TaskRegistry.deploy(TX_OVERRIDES);
  await taskRegistry.waitForDeployment();
  const taskRegistryAddress = await taskRegistry.getAddress();
  console.log("TaskRegistry deployed to:", taskRegistryAddress);

  // Deploy ProviderRegistry
  console.log("\nDeploying ProviderRegistry...");
  const ProviderRegistry = await ethers.getContractFactory("ProviderRegistry");
  const providerRegistry = await ProviderRegistry.deploy(TX_OVERRIDES);
  await providerRegistry.waitForDeployment();
  const providerRegistryAddress = await providerRegistry.getAddress();
  console.log("ProviderRegistry deployed to:", providerRegistryAddress);

  // Deploy ProofToken
  console.log("\nDeploying ProofToken...");
  const ProofToken = await ethers.getContractFactory("ProofToken");
  const proofToken = await ProofToken.deploy(TX_OVERRIDES);
  await proofToken.waitForDeployment();
  const proofTokenAddress = await proofToken.getAddress();
  console.log("ProofToken deployed to:", proofTokenAddress);

  // Deploy TaskEscrow
  console.log("\nDeploying TaskEscrow...");
  const TaskEscrow = await ethers.getContractFactory("TaskEscrow");
  const taskEscrow = await TaskEscrow.deploy(TX_OVERRIDES);
  await taskEscrow.waitForDeployment();
  const taskEscrowAddress = await taskEscrow.getAddress();
  console.log("TaskEscrow deployed to:", taskEscrowAddress);

  // Deploy TaskConsensus
  console.log("\nDeploying TaskConsensus...");
  const TaskConsensus = await ethers.getContractFactory("TaskConsensus");
  const taskConsensus = await TaskConsensus.deploy(TX_OVERRIDES);
  await taskConsensus.waitForDeployment();
  const taskConsensusAddress = await taskConsensus.getAddress();
  console.log("TaskConsensus deployed to:", taskConsensusAddress);

  // Deploy TaskReceiptNFT
  console.log("\nDeploying TaskReceiptNFT...");
  const TaskReceiptNFT = await ethers.getContractFactory("TaskReceiptNFT");
  const taskReceiptNFT = await TaskReceiptNFT.deploy(TX_OVERRIDES);
  await taskReceiptNFT.waitForDeployment();
  const taskReceiptNFTAddress = await taskReceiptNFT.getAddress();
  console.log("TaskReceiptNFT deployed to:", taskReceiptNFTAddress);

  // Set contract relationships
  console.log("\nSetting up contract relationships...");

  await (await taskRegistry.setEscrow(taskEscrowAddress, TX_OVERRIDES)).wait();
  await (await taskRegistry.setConsensus(taskConsensusAddress, TX_OVERRIDES)).wait();
  console.log("TaskRegistry configured");

  await (await taskEscrow.setTaskRegistry(taskRegistryAddress, TX_OVERRIDES)).wait();
  await (await taskEscrow.setTaskConsensus(taskConsensusAddress, TX_OVERRIDES)).wait();
  await (await taskEscrow.setProviderRegistry(providerRegistryAddress, TX_OVERRIDES)).wait();
  console.log("TaskEscrow configured");

  await (await taskConsensus.setTaskRegistry(taskRegistryAddress, TX_OVERRIDES)).wait();
  await (await taskConsensus.setTaskEscrow(taskEscrowAddress, TX_OVERRIDES)).wait();
  await (await taskConsensus.setProviderRegistry(providerRegistryAddress, TX_OVERRIDES)).wait();
  await (await taskConsensus.setProofToken(proofTokenAddress, TX_OVERRIDES)).wait();
  console.log("TaskConsensus configured");

  await (await providerRegistry.setTaskConsensus(taskConsensusAddress, TX_OVERRIDES)).wait();
  await (await providerRegistry.setProofToken(proofTokenAddress, TX_OVERRIDES)).wait();
  console.log("ProviderRegistry configured");

  await (await proofToken.setTaskConsensus(taskConsensusAddress, TX_OVERRIDES)).wait();
  console.log("ProofToken configured");

  await (await taskReceiptNFT.setTaskConsensus(taskConsensusAddress, TX_OVERRIDES)).wait();
  await (await taskReceiptNFT.setTaskRegistry(taskRegistryAddress, TX_OVERRIDES)).wait();
  console.log("TaskReceiptNFT configured");

  // Save deployment addresses
  const deploymentData = {
    network: process.env.HARDHAT_NETWORK || "hardhat",
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      TaskRegistry: taskRegistryAddress,
      ProviderRegistry: providerRegistryAddress,
      ProofToken: proofTokenAddress,
      TaskEscrow: taskEscrowAddress,
      TaskConsensus: taskConsensusAddress,
      TaskReceiptNFT: taskReceiptNFTAddress,
    },
  };

  const deploymentPath = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }

  fs.writeFileSync(
    path.join(deploymentPath, `${deploymentData.network}.json`),
    JSON.stringify(deploymentData, null, 2)
  );

  console.log("\nDeployment complete! Addresses saved to deployments/");
  console.log("\nContract Addresses:");
  console.log("===================");
  console.log(`TASK_REGISTRY_ADDRESS=${taskRegistryAddress}`);
  console.log(`PROVIDER_REGISTRY_ADDRESS=${providerRegistryAddress}`);
  console.log(`PROOF_TOKEN_ADDRESS=${proofTokenAddress}`);
  console.log(`TASK_ESCROW_ADDRESS=${taskEscrowAddress}`);
  console.log(`TASK_CONSENSUS_ADDRESS=${taskConsensusAddress}`);
  console.log(`TASK_RECEIPT_NFT_ADDRESS=${taskReceiptNFTAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
