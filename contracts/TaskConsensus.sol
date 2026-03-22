// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./TaskRegistry.sol";
import "./TaskEscrow.sol";
import "./ProviderRegistry.sol";
import "./ProofToken.sol";

/**
 * @title TaskConsensus
 * @notice Compares result hashes and determines consensus
 */
contract TaskConsensus is Ownable {
    constructor() Ownable(msg.sender) {}
    
    TaskRegistry public taskRegistry;
    TaskEscrow public taskEscrow;
    ProviderRegistry public providerRegistry;
    ProofToken public proofToken;
    
    // Result hash => count for a task
    mapping(bytes32 => mapping(bytes32 => uint256)) public resultCounts;
    
    // Task ID => provider => commitment hash
    mapping(bytes32 => mapping(address => bytes32)) public providerCommits;
    
    // Task ID => provider => result hash
    mapping(bytes32 => mapping(address => bytes32)) public providerResults;
    
    // Task ID => all submitted result hashes
    mapping(bytes32 => bytes32[]) public taskResultHashes;
    
    // Task ID => number of commits
    mapping(bytes32 => uint256) public commitCounts;

    // Task ID => number of reveals
    mapping(bytes32 => uint256) public revealCounts;
    
    // Consensus threshold (67%)
    uint256 public constant CONSENSUS_THRESHOLD = 6700; // basis points
    uint256 public constant DISPUTE_WINDOW = 1 hours;
    
    // Dispute state
    mapping(bytes32 => bool) public inDispute;
    mapping(bytes32 => uint256) public disputeEndTime;
    mapping(bytes32 => mapping(bytes32 => uint256)) public disputeVotes;
    
    event ResultCommitted(
        bytes32 indexed taskId,
        address indexed provider,
        bytes32 commitmentHash,
        uint256 timestamp
    );
    
    event ResultRevealed(
        bytes32 indexed taskId,
        address indexed provider,
        bytes32 resultHash,
        uint256 timestamp
    );
    
    event ConsensusReached(
        bytes32 indexed taskId,
        bytes32 winningResult,
        uint256 agreementRatio,
        address[] agreeingProviders
    );
    
    event DisputeOpened(bytes32 indexed taskId, uint256 endTime);
    event DisputeResolved(bytes32 indexed taskId, bytes32 winningResult);
    event NoConsensus(bytes32 indexed taskId);
    
    modifier validTask(bytes32 _taskId) {
        require(taskRegistry.getTask(_taskId).requester != address(0), "Task not found");
        _;
    }
    
    function setTaskRegistry(address _registry) external onlyOwner {
        taskRegistry = TaskRegistry(_registry);
    }
    
    function setTaskEscrow(address payable _escrow) external onlyOwner {
        taskEscrow = TaskEscrow(_escrow);
    }
    
    function setProviderRegistry(address _registry) external onlyOwner {
        providerRegistry = ProviderRegistry(_registry);
    }
    
    function setProofToken(address _token) external onlyOwner {
        proofToken = ProofToken(_token);
    }
    
    function commitResult(
        bytes32 _taskId,
        bytes32 _commitmentHash,
        address _provider
    ) external validTask(_taskId) {
        TaskRegistry.Task memory task = taskRegistry.getTask(_taskId);
        require(block.timestamp < task.deadline, "Deadline passed");
        require(
            task.state == TaskRegistry.TaskState.OPEN || 
            task.state == TaskRegistry.TaskState.CLAIMED,
            "Invalid task state"
        );
        require(providerCommits[_taskId][_provider] == bytes32(0), "Already committed");
        require(taskEscrow.getProviderStake(_taskId, _provider) > 0, "No stake found");
        
        providerCommits[_taskId][_provider] = _commitmentHash;
        commitCounts[_taskId]++;
        
        emit ResultCommitted(_taskId, _provider, _commitmentHash, block.timestamp);
    }
    
    function revealResult(
        bytes32 _taskId,
        bytes32 _resultHash,
        bytes32 _salt,
        address _provider
    ) external validTask(_taskId) {
        TaskRegistry.Task memory task = taskRegistry.getTask(_taskId);
        
        require(providerCommits[_taskId][_provider] != bytes32(0), "No commit found");
        require(providerResults[_taskId][_provider] == bytes32(0), "Already revealed");
        
        // Verify commitment (hash of result hash and salt)
        bytes32 expectedCommit = keccak256(abi.encodePacked(_resultHash, _salt));
        require(providerCommits[_taskId][_provider] == expectedCommit, "Invalid reveal");
        
        // Store result
        providerResults[_taskId][_provider] = _resultHash;
        
        // Track unique result hashes
        if (resultCounts[_taskId][_resultHash] == 0) {
            taskResultHashes[_taskId].push(_resultHash);
        }
        resultCounts[_taskId][_resultHash]++;
        revealCounts[_taskId]++;
        
        emit ResultRevealed(_taskId, _provider, _resultHash, block.timestamp);
        
        // Check if we have enough REVEALS to attempt consensus
        if (revealCounts[_taskId] >= task.minProviders) {
            _checkConsensus(_taskId);
        }
    }
    
    function _checkConsensus(bytes32 _taskId) internal {
        TaskRegistry.Task memory task = taskRegistry.getTask(_taskId);
        address[] memory providers = taskRegistry.getTaskProviders(_taskId);
        
        uint256 totalProviders = providers.length;
        bytes32[] memory hashes = taskResultHashes[_taskId];
        
        // Find the result hash with most votes
        bytes32 winningHash = bytes32(0);
        uint256 maxCount = 0;
        
        for (uint256 i = 0; i < hashes.length; i++) {
            uint256 count = resultCounts[_taskId][hashes[i]];
            if (count > maxCount) {
                maxCount = count;
                winningHash = hashes[i];
            }
        }
        
        // Calculate agreement ratio in basis points
        uint256 agreementRatio = (maxCount * 10000) / totalProviders;
        
        if (agreementRatio >= CONSENSUS_THRESHOLD) {
            // Consensus reached
            _settleWithConsensus(_taskId, winningHash, agreementRatio, providers);
        } else if (totalProviders >= task.minProviders * 2) {
            // Enough providers but no consensus - open dispute
            _openDispute(_taskId);
        }
        // Otherwise, wait for more providers
    }
    
    function _settleWithConsensus(
        bytes32 _taskId,
        bytes32 _winningHash,
        uint256 _agreementRatio,
        address[] memory _providers
    ) internal {
        // Separate agreeing and dissenting providers
        address[] memory agreeing = new address[](_providers.length);
        address[] memory dissenting = new address[](_providers.length);
        uint256 agreeCount = 0;
        uint256 dissentCount = 0;
        
        for (uint256 i = 0; i < _providers.length; i++) {
            if (providerResults[_taskId][_providers[i]] == _winningHash) {
                agreeing[agreeCount++] = _providers[i];
            } else {
                dissenting[dissentCount++] = _providers[i];
            }
        }
        
        // Trim arrays
        address[] memory finalAgreeing = new address[](agreeCount);
        address[] memory finalDissenting = new address[](dissentCount);
        for (uint256 i = 0; i < agreeCount; i++) {
            finalAgreeing[i] = agreeing[i];
        }
        for (uint256 i = 0; i < dissentCount; i++) {
            finalDissenting[i] = dissenting[i];
        }
        
        // Update task state
        taskRegistry.setConsensusResult(_taskId, _winningHash, _agreementRatio);
        
        // Settle stakes and rewards
        TaskRegistry.Task memory task = taskRegistry.getTask(_taskId);
        taskEscrow.settleTask(_taskId, finalAgreeing, finalDissenting, task.reward);
        
        // Update provider stats and mint PROOF tokens
        for (uint256 i = 0; i < agreeCount; i++) {
            providerRegistry.recordCorrectTask(agreeing[i]);
            proofToken.mint(agreeing[i], 1 * 10**8); // 1 PROOF token
        }
        
        for (uint256 i = 0; i < dissentCount; i++) {
            providerRegistry.recordSlashedTask(dissenting[i]);
        }
        
        emit ConsensusReached(_taskId, _winningHash, _agreementRatio, finalAgreeing);
    }
    
    function _openDispute(bytes32 _taskId) internal {
        inDispute[_taskId] = true;
        disputeEndTime[_taskId] = block.timestamp + DISPUTE_WINDOW;
        taskRegistry.openDispute(_taskId);
        
        emit DisputeOpened(_taskId, disputeEndTime[_taskId]);
    }
    
    function resolveDispute(
        bytes32 _taskId,
        bytes32 _winningResult,
        address[] calldata _winningProviders
    ) external onlyOwner validTask(_taskId) {
        require(inDispute[_taskId], "Not in dispute");
        require(block.timestamp >= disputeEndTime[_taskId], "Dispute window active");
        
        inDispute[_taskId] = false;
        
        address[] memory allProviders = taskRegistry.getTaskProviders(_taskId);
        address[] memory losingProviders = new address[](allProviders.length - _winningProviders.length);
        uint256 loseIdx = 0;
        
        for (uint256 i = 0; i < allProviders.length; i++) {
            bool isWinner = false;
            for (uint256 j = 0; j < _winningProviders.length; j++) {
                if (allProviders[i] == _winningProviders[j]) {
                    isWinner = true;
                    break;
                }
            }
            if (!isWinner) {
                losingProviders[loseIdx++] = allProviders[i];
            }
        }
        
        TaskRegistry.Task memory task = taskRegistry.getTask(_taskId);
        taskRegistry.setConsensusResult(_taskId, _winningResult, 10000); // 100%
        taskEscrow.settleTask(_taskId, _winningProviders, losingProviders, task.reward);
        
        for (uint256 i = 0; i < _winningProviders.length; i++) {
            providerRegistry.recordCorrectTask(_winningProviders[i]);
            proofToken.mint(_winningProviders[i], 1 * 10**8);
        }
        
        for (uint256 i = 0; i < losingProviders.length; i++) {
            if (losingProviders[i] != address(0)) {
                providerRegistry.recordSlashedTask(losingProviders[i]);
            }
        }
        
        emit DisputeResolved(_taskId, _winningResult);
    }
    
    function forceCheckConsensus(bytes32 _taskId) external validTask(_taskId) {
        TaskRegistry.Task memory task = taskRegistry.getTask(_taskId);
        require(block.timestamp >= task.deadline, "Deadline not reached");
        require(
            task.state == TaskRegistry.TaskState.OPEN || 
            task.state == TaskRegistry.TaskState.CLAIMED,
            "Invalid state"
        );
        
        address[] memory providers = taskRegistry.getTaskProviders(_taskId);
        if (providers.length == 0) {
            // No providers, cancel task
            taskRegistry.updateTaskState(_taskId, TaskRegistry.TaskState.SETTLED);
            emit NoConsensus(_taskId);
        } else if (providers.length < task.minProviders) {
            // Not enough providers
            taskRegistry.openDispute(_taskId);
        } else {
            _checkConsensus(_taskId);
        }
    }
    
    function getResultForProvider(bytes32 _taskId, address _provider) external view returns (bytes32) {
        return providerResults[_taskId][_provider];
    }
    
    function getResultCount(bytes32 _taskId, bytes32 _resultHash) external view returns (uint256) {
        return resultCounts[_taskId][_resultHash];
    }
    
    function getAllResults(bytes32 _taskId) external view returns (bytes32[] memory) {
        return taskResultHashes[_taskId];
    }
}
