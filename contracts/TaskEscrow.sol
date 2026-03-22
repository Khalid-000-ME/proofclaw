// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./TaskRegistry.sol";

/**
 * @title TaskEscrow
 * @notice Manages requester payments and provider stakes
 */
contract TaskEscrow is Ownable, ReentrancyGuard {
    constructor() Ownable(msg.sender) {}
    
    TaskRegistry public taskRegistry;
    address public taskConsensus;
    address public providerRegistry;
    
    // Task ID => total staked amount
    mapping(bytes32 => uint256) public taskStakes;
    
    // Task ID => provider => staked amount
    mapping(bytes32 => mapping(address => uint256)) public providerStakes;
    
    // Provider => total staked
    mapping(address => uint256) public totalStaked;
    
    // Accumulated rewards per provider
    mapping(address => uint256) public accumulatedRewards;
    
    // Protocol treasury
    uint256 public treasury;
    
    uint256 public constant SLASH_PERCENTAGE = 50; // 50% slashed
    uint256 public constant TREASURY_SHARE = 25;   // 25% of slash to treasury
    uint256 public constant REWARD_SHARE = 75;     // 75% of reward pool to agreeing providers
    
    event PaymentDeposited(bytes32 indexed taskId, address indexed requester, uint256 amount);
    event StakeDeposited(bytes32 indexed taskId, address indexed provider, uint256 amount);
    event StakeReleased(bytes32 indexed taskId, address indexed provider, uint256 amount);
    event StakeSlashed(bytes32 indexed taskId, address indexed provider, uint256 amount, uint256 treasuryAmount);
    event RewardPaid(bytes32 indexed taskId, address indexed provider, uint256 amount);
    event TreasuryWithdrawn(address indexed to, uint256 amount);
    
    modifier onlyConsensus() {
        require(msg.sender == taskConsensus, "Only TaskConsensus");
        _;
    }

    modifier onlyConsensusOrOwner() {
        require(msg.sender == taskConsensus || msg.sender == owner(), "Only TaskConsensus or owner");
        _;
    }
    
    modifier validTask(bytes32 _taskId) {
        require(taskRegistry.getTask(_taskId).requester != address(0), "Task not found");
        _;
    }
    
    function setTaskRegistry(address _registry) external onlyOwner {
        taskRegistry = TaskRegistry(_registry);
    }
    
    function setTaskConsensus(address _consensus) external onlyOwner {
        taskConsensus = _consensus;
    }
    
    function setProviderRegistry(address _providerRegistry) external onlyOwner {
        providerRegistry = _providerRegistry;
    }
    
    function depositPayment(
        bytes32 _taskId,
        TaskRegistry.TaskType _taskType,
        bytes32 _inputHash,
        uint256 _stakeRequired,
        uint256 _minProviders,
        uint256 _deadline,
        bytes32 _hcsTaskTopic
    ) external payable nonReentrant returns (bytes32) {
        require(msg.value > 0, "Payment required");
        
        bytes32 taskId = taskRegistry.createTask{value: 0}(
            _taskType,
            _inputHash,
            msg.value,
            _stakeRequired,
            _minProviders,
            _deadline,
            _hcsTaskTopic
        );
        
        emit PaymentDeposited(taskId, msg.sender, msg.value);
        
        return taskId;
    }
    
    function stakeForTask(bytes32 _taskId) external payable nonReentrant validTask(_taskId) {
        TaskRegistry.Task memory task = taskRegistry.getTask(_taskId);
        require(msg.value >= task.stakeRequired, "Insufficient stake");
        require(block.timestamp < task.deadline, "Deadline passed");
        require(
            task.state == TaskRegistry.TaskState.OPEN || 
            task.state == TaskRegistry.TaskState.CLAIMED,
            "Task not claimable"
        );
        
        providerStakes[_taskId][msg.sender] += msg.value;
        taskStakes[_taskId] += msg.value;
        totalStaked[msg.sender] += msg.value;
        
        taskRegistry.claimTask(_taskId, msg.sender);
        
        emit StakeDeposited(_taskId, msg.sender, msg.value);
    }
    
    function settleTask(
        bytes32 _taskId,
        address[] calldata _agreeingProviders,
        address[] calldata _dissentingProviders,
        uint256 _totalReward
    ) external onlyConsensusOrOwner nonReentrant validTask(_taskId) {
        TaskRegistry.Task memory task = taskRegistry.getTask(_taskId);
        uint256 rewardPerProvider = _totalReward / _agreeingProviders.length;
        
        // Release stakes and pay rewards to agreeing providers
        for (uint256 i = 0; i < _agreeingProviders.length; i++) {
            address provider = _agreeingProviders[i];
            uint256 staked = providerStakes[_taskId][provider];
            
            if (staked > 0) {
                providerStakes[_taskId][provider] = 0;
                totalStaked[provider] -= staked;
                
                uint256 payout = staked + rewardPerProvider;
                
                // Auto-transfer rewards to provider
                (bool success, ) = payable(provider).call{value: payout}("");
                require(success, "Reward transfer failed");
                
                emit StakeReleased(_taskId, provider, staked);
                emit RewardPaid(_taskId, provider, rewardPerProvider);
            }
        }
        
        // Slash dissenting providers
        for (uint256 i = 0; i < _dissentingProviders.length; i++) {
            address provider = _dissentingProviders[i];
            uint256 staked = providerStakes[_taskId][provider];
            
            if (staked > 0) {
                uint256 slashAmount = (staked * SLASH_PERCENTAGE) / 100;
                uint256 treasuryAmount = (slashAmount * TREASURY_SHARE) / 100;
                uint256 rewardAmount = slashAmount - treasuryAmount;
                
                providerStakes[_taskId][provider] = 0;
                totalStaked[provider] -= staked;
                
                // Return remaining stake to provider
                uint256 returnAmount = staked - slashAmount;
                if (returnAmount > 0) {
                    (bool success, ) = payable(provider).call{value: returnAmount}("");
                    require(success, "Return stake transfer failed");
                }
                
                treasury += treasuryAmount;
                
                emit StakeSlashed(_taskId, provider, slashAmount, treasuryAmount);
            }
        }
        
        taskStakes[_taskId] = 0;
    }
    
    function withdrawRewards() external nonReentrant {
        uint256 amount = accumulatedRewards[msg.sender];
        require(amount > 0, "No rewards to withdraw");
        
        accumulatedRewards[msg.sender] = 0;
        
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
    }
    
    function withdrawTreasury(address _to, uint256 _amount) external onlyOwner {
        require(_amount <= treasury, "Insufficient treasury");
        treasury -= _amount;
        
        (bool success, ) = payable(_to).call{value: _amount}("");
        require(success, "Transfer failed");
        
        emit TreasuryWithdrawn(_to, _amount);
    }
    
    function getProviderStake(bytes32 _taskId, address _provider) external view returns (uint256) {
        return providerStakes[_taskId][_provider];
    }
    
    function getTaskTotalStake(bytes32 _taskId) external view returns (uint256) {
        return taskStakes[_taskId];
    }
    
    function getPendingRewards(address _provider) external view returns (uint256) {
        return accumulatedRewards[_provider];
    }
    
    receive() external payable {
        treasury += msg.value;
    }
}
