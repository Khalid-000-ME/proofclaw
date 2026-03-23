import { ethers } from 'ethers';
import fs from 'fs';
const deployment = JSON.parse(fs.readFileSync('deployments/hederaTestnet.json', 'utf8'));
const ABI = [
  'function getAllTasks(uint256 _offset, uint256 _limit) external view returns (bytes32[])',
  'function getTask(bytes32 _taskId) external view returns (tuple(bytes32 taskId, address requester, uint8 taskType, bytes32 inputHash, uint256 reward, uint256 stakeRequired, uint256 minProviders, uint256 deadline, uint256 createdAt, bytes32 hcsTaskTopic, uint8 state, bytes32 consensusResult, uint256 agreementRatio))',
];
const provider = new ethers.JsonRpcProvider('https://testnet.hashio.io/api');
const registry = new ethers.Contract(deployment.contracts.TaskRegistry, ABI, provider);

async function main() {
  const ids = await registry.getAllTasks(0, 10);
  const lastId = ids[ids.length - 1];
  console.log("Last Task ID:", lastId);
  const t = await registry.getTask(lastId);
  console.log("Task Type:", t.taskType);
  console.log("Reward:", t.reward.toString());
  console.log("Min Providers:", t.minProviders.toString());
  console.log("Stake Required:", t.stakeRequired.toString());
}
main().catch(console.error);
