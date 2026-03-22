import pkg from "hardhat";
const { ethers } = pkg;
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";
import { Client, TopicMessageSubmitTransaction, PrivateKey } from "@hashgraph/sdk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env.local") });

async function main() {
  const [deployer] = await ethers.getSigners();
  let signer: any = deployer;
  
  if (process.env.REQUESTER_EVM_PRIVATE_KEY) {
      signer = new ethers.Wallet(process.env.REQUESTER_EVM_PRIVATE_KEY, ethers.provider);
      console.log("Using dedicated Requester EVM Wallet:", signer.address);
  } else {
      console.log("Using default Deployer EVM Wallet:", signer.address);
  }
  
  // Load deployment data
  const network = process.env.HARDHAT_NETWORK || "hederaTestnet";
  const deploymentPath = path.join(__dirname, "../deployments", `${network}.json`);
  
  if (!fs.existsSync(deploymentPath)) {
    console.error("Deployment file not found. Run deploy first.");
    process.exit(1);
  }
  
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
  const addresses = deployment.contracts;
  
  console.log("Seeding tasks on network:", network);
  console.log("Using TaskRegistry at:", addresses.TaskRegistry);
  
  // Set up Hedera Client for HCS
  const accountId = process.env.HEDERA_ACCOUNT_ID;
  const hederaKey = process.env.HEDERA_PRIVATE_KEY;
  const tasksTopic = process.env.TASKS_TOPIC;
  
  if (!accountId || !hederaKey || !tasksTopic) {
      console.warn("HEDERA_ACCOUNT_ID, HEDERA_PRIVATE_KEY, or TASKS_TOPIC not found. Cannot seed HCS messages.");
  }
  
  let hederaClient: Client | null = null;
  if (accountId && hederaKey) {
      hederaClient = network === "hederaTestnet" ? Client.forTestnet() : Client.forTestnet(); // always testnet locally
      hederaClient.setOperator(accountId, PrivateKey.fromString(hederaKey));
      console.log("Hedera HCS Client initialized for Topic:", tasksTopic);
  }
  
  // Get contract instances — connect to the requester signer if available
  const TaskRegistry = await ethers.getContractFactory("TaskRegistry");
  const TaskEscrow = await ethers.getContractFactory("TaskEscrow");
  
  const taskRegistry = TaskRegistry.attach(addresses.TaskRegistry).connect(signer) as any;
  const taskEscrow = TaskEscrow.attach(addresses.TaskEscrow).connect(signer) as any;
  
  // Demo tasks to create
  const demoTasks = [
    {
      taskType: 0, // CLASSIFICATION
      inputHash: ethers.keccak256(ethers.toUtf8Bytes("News headline about tech stocks rising")),
      reward: ethers.parseEther("2"),
      stakeRequired: ethers.parseUnits("1", 8),

      minProviders: 2,
      deadlineMinutes: 1440,
      hcsTopic: ethers.keccak256(ethers.toUtf8Bytes("task_1")),
    },
    {
      taskType: 1, // EXTRACTION
      inputHash: ethers.keccak256(ethers.toUtf8Bytes("Document with key data points")),
      reward: ethers.parseEther("2"),
      stakeRequired: ethers.parseUnits("1", 8),
      minProviders: 2,
      deadlineMinutes: 1440,
      hcsTopic: ethers.keccak256(ethers.toUtf8Bytes("task_2")),
    },
    {
      taskType: 2, // SCORING
      inputHash: ethers.keccak256(ethers.toUtf8Bytes("Risk assessment data")),
      reward: ethers.parseEther("2"),
      stakeRequired: ethers.parseUnits("1", 8),
      minProviders: 2,
      deadlineMinutes: 1440,
      hcsTopic: ethers.keccak256(ethers.toUtf8Bytes("task_3")),
    },
    {
      taskType: 4, // VERIFICATION
      inputHash: ethers.keccak256(ethers.toUtf8Bytes("Claim to verify: Product X is organic")),
      reward: ethers.parseEther("2"),
      stakeRequired: ethers.parseUnits("1", 8),
      minProviders: 2,
      deadlineMinutes: 1440,
      hcsTopic: ethers.keccak256(ethers.toUtf8Bytes("task_4")),
    },
    {
      taskType: 0, // CLASSIFICATION
      inputHash: ethers.keccak256(ethers.toUtf8Bytes("Sentiment analysis input")),
      reward: ethers.parseEther("2"),
      stakeRequired: ethers.parseUnits("1", 8),
      minProviders: 3,
      deadlineMinutes: 1440,
      hcsTopic: ethers.keccak256(ethers.toUtf8Bytes("task_5")),
    },
  ];
  
  console.log(`\nCreating ${demoTasks.length} demo tasks...\n`);
  
  for (let i = 0; i < demoTasks.length; i++) {
    const task = demoTasks[i];
    const deadline = Math.floor(Date.now() / 1000) + task.deadlineMinutes * 60;
    
    const TX_OVERRIDES = { gasLimit: 2_000_000, gasPrice: BigInt("1200000000000") };
    try {
      const dummyTaskId = ethers.ZeroHash;
      const tx = await taskEscrow.depositPayment(
        dummyTaskId,
        task.taskType,
        task.inputHash,
        task.stakeRequired,
        task.minProviders,
        deadline,
        task.hcsTopic,
        { value: task.reward, ...TX_OVERRIDES }
      );
      
      const receipt = await tx.wait();
      
      // Extract the actual taskId from the PaymentDeposited event
      // Event: PaymentDeposited(bytes32 indexed taskId, address indexed requester, uint256 amount)
      let actualTaskId = ethers.ZeroHash;
      for (const log of receipt.logs) {
         try {
             // TaskEscrow ABI contains PaymentDeposited
             const parsedLog = taskEscrow.interface.parseLog(log);
             if (parsedLog?.name === "PaymentDeposited") {
                 actualTaskId = parsedLog.args[0];
                 break;
             }
         } catch(e) {}
      }
      
      const taskId = actualTaskId; 
      
      console.log(`Task created on EVM with ID: ${taskId}. Gas used: ${receipt?.gasUsed}`);
      
      if (hederaClient && tasksTopic) {
         // Create the Task payload JSON for the Mirror Node to index
         const msgObj = {
             taskId: taskId,
             taskType: ["CLASSIFICATION", "EXTRACTION", "SCORING", "GENERATION", "VERIFICATION"][task.taskType] || "CLASSIFICATION",
             inputHash: task.inputHash,
             inputEndpoint: "https://proofclaw.io/tasks/sample_input.json",
         };
         
         const hcsTx = new TopicMessageSubmitTransaction()
            .setTopicId(tasksTopic)
            .setMessage(JSON.stringify(msgObj));
            
         const hcsResp = await hcsTx.execute(hederaClient);
         const hcsReceipt = await hcsResp.getReceipt(hederaClient);
         console.log(`📡 Broadcasted to HCS Topic: ${tasksTopic} (Seq: ${hcsReceipt.topicSequenceNumber})`);
      }
    } catch (error) {
      console.error(`Failed to create task ${i + 1}:`, error);
    }
  }
  
  // Get total task count
  const taskCount = await taskRegistry.getTaskCount();
  console.log(`\nTotal tasks in registry: ${taskCount}`);
  
  console.log("\nSeed tasks complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
