// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ProviderRegistry
 * @notice Manages provider registration, reputation, and slash history
 */
contract ProviderRegistry is Ownable {
    constructor() Ownable(msg.sender) {}
    
    struct Provider {
        address providerAddress;
        bytes32 hcsAgentId;
        uint256 stakedHBAR;
        uint256 totalTasksCompleted;
        uint256 totalTasksSlashed;
        uint256 reputationScore;
        uint256 proofTokensEarned;
        bool isActive;
        uint256 registeredAt;
        string metadataURI;
    }
    
    // Provider address => Provider data
    mapping(address => Provider) public providers;
    
    // HCS Agent ID => provider address
    mapping(bytes32 => address) public agentToProvider;
    
    // All registered provider addresses
    address[] public providerList;
    
    // Task history per provider (taskId => was correct)
    mapping(address => mapping(bytes32 => bool)) public taskHistory;
    
    // Recent task IDs for reputation weighting
    mapping(address => bytes32[]) public recentTasks;
    uint256 public constant RECENT_WINDOW = 100; // last 100 tasks
    
    address public taskConsensus;
    address public proofToken;
    
    uint256 public constant INITIAL_REPUTATION = 5000; // 50/100
    uint256 public constant MAX_REPUTATION = 10000;   // 100/100
    uint256 public constant RECENT_WEIGHT = 2;        // 2x weight for recent tasks
    
    event ProviderRegistered(
        address indexed provider,
        bytes32 hcsAgentId,
        uint256 initialStake,
        uint256 registeredAt
    );
    
    event ProviderUpdated(address indexed provider, uint256 newStake);
    event ProviderDeactivated(address indexed provider);
    event TaskCompleted(address indexed provider, bytes32 indexed taskId, bool correct);
    event ReputationUpdated(address indexed provider, uint256 newScore);
    
    modifier onlyConsensus() {
        require(msg.sender == taskConsensus, "Only TaskConsensus");
        _;
    }
    
    function setTaskConsensus(address _consensus) external onlyOwner {
        taskConsensus = _consensus;
    }
    
    function setProofToken(address _token) external onlyOwner {
        proofToken = _token;
    }
    
    function register(bytes32 _hcsAgentId, string calldata _metadataURI) external payable {
        require(!providers[msg.sender].isActive, "Already registered");
        require(agentToProvider[_hcsAgentId] == address(0), "Agent ID in use");
        require(msg.value >= 1 * 1e8, "Minimum 1 HBAR stake required"); // 1 HBAR
        
        providers[msg.sender] = Provider({
            providerAddress: msg.sender,
            hcsAgentId: _hcsAgentId,
            stakedHBAR: msg.value,
            totalTasksCompleted: 0,
            totalTasksSlashed: 0,
            reputationScore: INITIAL_REPUTATION,
            proofTokensEarned: 0,
            isActive: true,
            registeredAt: block.timestamp,
            metadataURI: _metadataURI
        });
        
        agentToProvider[_hcsAgentId] = msg.sender;
        providerList.push(msg.sender);
        
        emit ProviderRegistered(msg.sender, _hcsAgentId, msg.value, block.timestamp);
    }
    
    function addStake() external payable {
        require(providers[msg.sender].isActive, "Not registered");
        providers[msg.sender].stakedHBAR += msg.value;
        
        emit ProviderUpdated(msg.sender, providers[msg.sender].stakedHBAR);
    }
    
    function withdrawStake(uint256 _amount) external {
        Provider storage provider = providers[msg.sender];
        require(provider.isActive, "Not registered");
        require(_amount <= provider.stakedHBAR, "Insufficient stake");
        
        // Keep minimum 1 HBAR
        uint256 minRequired = 1 * 1e8;
        require(provider.stakedHBAR - _amount >= minRequired, "Must keep minimum stake");
        
        provider.stakedHBAR -= _amount;
        
        (bool success, ) = payable(msg.sender).call{value: _amount}("");
        require(success, "Transfer failed");
        
        emit ProviderUpdated(msg.sender, provider.stakedHBAR);
    }
    
    function recordCorrectTask(address _provider) external onlyConsensus {
        Provider storage provider = providers[_provider];
        require(provider.isActive, "Provider not active");
        
        provider.totalTasksCompleted++;
        provider.proofTokensEarned += 1 * 10**8; // 1 PROOF
        
        _updateReputation(_provider);
        
        emit TaskCompleted(_provider, bytes32(0), true);
    }
    
    function recordSlashedTask(address _provider) external onlyConsensus {
        Provider storage provider = providers[_provider];
        require(provider.isActive, "Provider not active");
        
        provider.totalTasksCompleted++;
        provider.totalTasksSlashed++;
        
        _updateReputation(_provider);
        
        emit TaskCompleted(_provider, bytes32(0), false);
    }
    
    function _updateReputation(address _provider) internal {
        Provider storage provider = providers[_provider];
        
        uint256 total = provider.totalTasksCompleted;
        uint256 slashed = provider.totalTasksSlashed;
        uint256 correct = total - slashed;
        
        if (total == 0) {
            provider.reputationScore = INITIAL_REPUTATION;
            return;
        }
        
        // Additive logic to prevent aggressive slashing scale drops
        // +500 (5%) per correct task, -500 (5%) per slash
        uint256 baseScore = INITIAL_REPUTATION + (correct * 500);
        uint256 penalty = slashed * 500;
        
        if (penalty >= baseScore) {
            baseScore = 0;
        } else {
            baseScore = baseScore - penalty;
        }
        
        if (baseScore > MAX_REPUTATION) {
            baseScore = MAX_REPUTATION;
        }
        
        provider.reputationScore = baseScore;
        
        // Deactivate if reputation too low
        if (baseScore < 2000) { // Below 20/100
            provider.isActive = false;
            emit ProviderDeactivated(_provider);
        }
        
        emit ReputationUpdated(_provider, baseScore);
    }
    
    function deactivate() external {
        require(providers[msg.sender].isActive, "Not active");
        providers[msg.sender].isActive = false;
        emit ProviderDeactivated(msg.sender);
    }
    
    function reactivate() external payable {
        Provider storage provider = providers[msg.sender];
        require(!provider.isActive, "Already active");
        require(msg.value >= 1 * 1e8, "Minimum 1 HBAR stake required");
        
        provider.isActive = true;
        provider.stakedHBAR += msg.value;
        
        // Reset reputation to initial
        provider.reputationScore = INITIAL_REPUTATION;
        provider.totalTasksCompleted = 0;
        provider.totalTasksSlashed = 0;
        
        emit ProviderUpdated(msg.sender, provider.stakedHBAR);
    }
    
    function updateMetadata(string calldata _metadataURI) external {
        require(providers[msg.sender].isActive, "Not registered");
        providers[msg.sender].metadataURI = _metadataURI;
    }
    
    function getProvider(address _provider) external view returns (Provider memory) {
        return providers[_provider];
    }
    
    function getProviderByAgent(bytes32 _agentId) external view returns (Provider memory) {
        return providers[agentToProvider[_agentId]];
    }
    
    function getAllProviders(uint256 _offset, uint256 _limit) external view returns (address[] memory) {
        uint256 end = _offset + _limit;
        if (end > providerList.length) {
            end = providerList.length;
        }
        uint256 size = end > _offset ? end - _offset : 0;
        address[] memory result = new address[](size);
        for (uint256 i = 0; i < size; i++) {
            result[i] = providerList[_offset + i];
        }
        return result;
    }
    
    function getProviderCount() external view returns (uint256) {
        return providerList.length;
    }
    
    function getActiveProviderCount() external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < providerList.length; i++) {
            if (providers[providerList[i]].isActive) {
                count++;
            }
        }
        return count;
    }
    
    function getTopProviders(uint256 _count) external view returns (address[] memory) {
        uint256 size = _count > providerList.length ? providerList.length : _count;
        address[] memory result = new address[](size);
        
        // Simple approach: return first N active providers
        uint256 idx = 0;
        for (uint256 i = 0; i < providerList.length && idx < size; i++) {
            if (providers[providerList[i]].isActive) {
                result[idx++] = providerList[i];
            }
        }
        
        return result;
    }
}
