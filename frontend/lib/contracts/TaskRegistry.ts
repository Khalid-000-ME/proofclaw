import { ethers } from 'ethers';

const TASK_REGISTRY_ABI = [
  "function getTask(bytes32 _taskId) external view returns (tuple(bytes32 taskId, address requester, uint8 taskType, bytes32 inputHash, uint256 reward, uint256 stakeRequired, uint256 minProviders, uint256 deadline, uint256 createdAt, bytes32 hcsTaskTopic, uint8 state, bytes32 consensusResult, uint256 agreementRatio))",
  "function getTaskProviders(bytes32 _taskId) external view returns (address[] memory)",
  "function getTaskCount() external view returns (uint256)"
];

export class TaskRegistry {
  private contract: ethers.Contract;

  constructor(address: string, provider: ethers.Provider) {
    this.contract = new ethers.Contract(address, TASK_REGISTRY_ABI, provider);
  }

  async getTask(taskId: string) {
    return await this.contract.getTask(taskId);
  }

  async getTaskProviders(taskId: string) {
    return await this.contract.getTaskProviders(taskId);
  }

  async getTaskCount() {
    return await this.contract.getTaskCount();
  }
}
