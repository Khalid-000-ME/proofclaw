import pkg from "hardhat";
const { ethers } = pkg;
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const [deployer] = await ethers.getSigners();
  
  // Load deployment data
  const network = process.env.HARDHAT_NETWORK || "hederaTestnet";
  const deploymentPath = path.join(__dirname, "../deployments", `${network}.json`);
  
  if (!fs.existsSync(deploymentPath)) {
    console.error("Deployment file not found. Run deploy first.");
    process.exit(1);
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const addresses = deployment.contracts;
  
  console.log("Registering provider on network:", network);
  console.log("Using ProviderRegistry at:", addresses.ProviderRegistry);
  
  // Get contract instance
  const ProviderRegistry = await ethers.getContractFactory("ProviderRegistry");
  const providerRegistry = ProviderRegistry.attach(addresses.ProviderRegistry);
  
  // Generate HCS Agent ID
  const hcsAgentId = ethers.keccak256(
    ethers.toUtf8Bytes(`proofclaw_provider_${deployer.address}_${Date.now()}`)
  );
  
  const metadataURI = "https://proofclaw.io/providers/metadata/default.json";
  const stakeAmount = ethers.parseEther("1"); // 1 HBAR
  
  console.log("\nProvider details:");
  console.log("Address:", deployer.address);
  console.log("HCS Agent ID:", hcsAgentId);
  console.log("Initial stake:", "1", "HBAR");
  
  const TX_OVERRIDES = {
    gasLimit: 1_000_000,
    gasPrice: BigInt("1200000000000"),
  };

  try {
    const tx = await providerRegistry.register(hcsAgentId, metadataURI, {
      value: stakeAmount,
      ...TX_OVERRIDES,
    });
    
    const receipt = await tx.wait();
    console.log("\nProvider registered successfully!");
    console.log("Gas used:", receipt?.gasUsed);
    
    // Get provider info
    const provider = await providerRegistry.getProvider(deployer.address);
    console.log("\nProvider info:");
    console.log("  Active:", provider.isActive);
    console.log("  Staked HBAR:", ethers.formatUnits(provider.stakedHBAR, 8));
    console.log("  Reputation:", (Number(provider.reputationScore) / 100).toFixed(2), "/ 100");
    console.log("  Registered at:", new Date(Number(provider.registeredAt) * 1000).toISOString());
    
  } catch (error: any) {
      console.log("\nRegistration encountered a revert (most likely already registered):", error.shortMessage || error.message);
      
      try {
        // Fetch existing provider info to verify status
        const provider = await providerRegistry.getProvider(deployer.address);
        console.log("\nCurrent provider info:");
        console.log("  Active:", provider.isActive);
        console.log("  Staked HBAR:", ethers.formatUnits(provider.stakedHBAR, 8));
        console.log("  Total tasks:", provider.totalTasksCompleted.toString());
        console.log("  Reputation:", (Number(provider.reputationScore) / 100).toFixed(2), "/ 100");
      } catch (innerError) {
        console.error("Could not fetch provider details either.");
      }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
