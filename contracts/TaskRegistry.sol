// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TaskRegistry
 * @notice Creates and manages AI tasks on the ProofClaw network
 */
contract TaskRegistry is Ownable {
    constructor() Ownable(msg.sender) {}
    
    enum TaskType {
        CLASSIFICATION,
        EXTRACTION,
        SCORING,
        PREDICTION,
        VERIFICATION
    }
    
    enum TaskState {
        OPEN,
        CLAIMED,
        CONSENSUS,
        SETTLED,
        DISPUTED
    }
    
    struct Task {
        bytes32 taskId;
        address requester;
        TaskType taskType;
        bytes32 inputHash;
        uint256 reward;
        uint256 stakeRequired;
        uint256 minProviders;
        uint256 deadline;
        uint256 createdAt;
        bytes32 hcsTaskTopic;
        TaskState state;
        bytes32 consensusResult;
        uint256 agreementRatio;
    }
    
    // Task ID => Task
    mapping(bytes32 => Task) public tasks;
    
    // Requester => task IDs
    mapping(address => bytes32[]) public requesterTasks;
    
    // Task ID => provider addresses who claimed
    mapping(bytes32 => address[]) public taskProviders;
    
    // Task ID => provider => has claimed
    mapping(bytes32 => mapping(address => bool)) public hasClaimed;
    
    bytes32[] public allTaskIds;
    
    address public taskEscrow;
    address public taskConsensus;
    
    uint256 public constant DEFAULT_MIN_PROVIDERS = 2;
    uint256 public constant DEFAULT_STAKE = 1 * 1e8; // 1 HBAR in tinybars
    uint256 public constant MIN_DEADLINE = 5 minutes;
    uint256 public constant MAX_DEADLINE = 7 days;
    
    event TaskCreated(
        bytes32 indexed taskId,
        address indexed requester,
        TaskType taskType,
        uint256 reward,
        uint256 stakeRequired,
        uint256 deadline
    );
    
    event TaskClaimed(bytes32 indexed taskId, address indexed provider);
    event TaskStateChanged(bytes32 indexed taskId, TaskState newState);
    
    modifier onlyEscrow() {
        require(msg.sender == taskEscrow, "Only TaskEscrow");
        _;
    }
    
    modifier onlyConsensus() {
        require(msg.sender == taskConsensus, "Only TaskConsensus");
        _;
    }
    
    function setEscrow(address _escrow) external onlyOwner {
        taskEscrow = _escrow;
    }
    
    function setConsensus(address _consensus) external onlyOwner {
        taskConsensus = _consensus;
    }
    
    function createTask(
        TaskType _taskType,
        bytes32 _inputHash,
        uint256 _reward,
        uint256 _stakeRequired,
        uint256 _minProviders,
        uint256 _deadline,
        bytes32 _hcsTaskTopic
    ) external payable returns (bytes32) {
        require(_reward > 0, "Reward must be > 0");
        require(_deadline >= block.timestamp + MIN_DEADLINE, "Deadline too short");
        require(_deadline <= block.timestamp + MAX_DEADLINE, "Deadline too long");
        
        if (_minProviders == 0) {
            _minProviders = DEFAULT_MIN_PROVIDERS;
        }
        if (_stakeRequired == 0) {
            _stakeRequired = DEFAULT_STAKE;
        }
        
        bytes32 taskId = keccak256(abi.encodePacked(
            msg.sender,
            _inputHash,
            block.timestamp,
            allTaskIds.length
        ));
        
        tasks[taskId] = Task({
            taskId: taskId,
            requester: msg.sender,
            taskType: _taskType,
            inputHash: _inputHash,
            reward: _reward,
            stakeRequired: _stakeRequired,
            minProviders: _minProviders,
            deadline: _deadline,
            createdAt: block.timestamp,
            hcsTaskTopic: _hcsTaskTopic,
            state: TaskState.OPEN,
            consensusResult: bytes32(0),
            agreementRatio: 0
        });
        
        allTaskIds.push(taskId);
        requesterTasks[msg.sender].push(taskId);
        
        emit TaskCreated(
            taskId,
            msg.sender,
            _taskType,
            _reward,
            _stakeRequired,
            _deadline
        );
        
        return taskId;
    }
    
    function claimTask(bytes32 _taskId, address _provider) external onlyEscrow {
        Task storage task = tasks[_taskId];
        require(task.state == TaskState.OPEN || task.state == TaskState.CLAIMED, "Invalid state");
        require(!hasClaimed[_taskId][_provider], "Already claimed");
        require(block.timestamp < task.deadline, "Deadline passed");
        
        hasClaimed[_taskId][_provider] = true;
        taskProviders[_taskId].push(_provider);
        
        if (task.state == TaskState.OPEN) {
            task.state = TaskState.CLAIMED;
            emit TaskStateChanged(_taskId, TaskState.CLAIMED);
        }
        
        emit TaskClaimed(_taskId, _provider);
    }
    
    function updateTaskState(bytes32 _taskId, TaskState _newState) external onlyConsensus {
        tasks[_taskId].state = _newState;
        emit TaskStateChanged(_taskId, _newState);
    }
    
    function setConsensusResult(
        bytes32 _taskId,
        bytes32 _resultHash,
        uint256 _agreementRatio
    ) external onlyConsensus {
        Task storage task = tasks[_taskId];
        task.consensusResult = _resultHash;
        task.agreementRatio = _agreementRatio;
        task.state = TaskState.SETTLED;
        emit TaskStateChanged(_taskId, TaskState.SETTLED);
    }
    
    function openDispute(bytes32 _taskId) external onlyConsensus {
        tasks[_taskId].state = TaskState.DISPUTED;
        emit TaskStateChanged(_taskId, TaskState.DISPUTED);
    }
    
    function getTask(bytes32 _taskId) external view returns (Task memory) {
        return tasks[_taskId];
    }
    
    function getTaskProviders(bytes32 _taskId) external view returns (address[] memory) {
        return taskProviders[_taskId];
    }
    
    function getRequesterTasks(address _requester) external view returns (bytes32[] memory) {
        return requesterTasks[_requester];
    }
    
    function getAllTasks(uint256 _offset, uint256 _limit) external view returns (bytes32[] memory) {
        uint256 end = _offset + _limit;
        if (end > allTaskIds.length) {
            end = allTaskIds.length;
        }
        uint256 size = end > _offset ? end - _offset : 0;
        bytes32[] memory result = new bytes32[](size);
        for (uint256 i = 0; i < size; i++) {
            result[i] = allTaskIds[_offset + i];
        }
        return result;
    }
    
    function getTaskCount() external view returns (uint256) {
        return allTaskIds.length;
    }
}
