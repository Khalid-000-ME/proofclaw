// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./TaskRegistry.sol";

/**
 * @title TaskReceiptNFT
 * @notice ERC-721 NFT minted on task settlement as proof of verified completion
 */
contract TaskReceiptNFT is ERC721, Ownable {
    
    struct Receipt {
        bytes32 taskId;
        bytes32 resultHash;
        uint256 consensusTimestamp;
        address[] providerIds;
        uint256 agreementRatio;
        TaskType taskType;
    }
    
    // Token ID => Receipt
    mapping(uint256 => Receipt) public receipts;
    
    // Task ID => token ID
    mapping(bytes32 => uint256) public taskToToken;
    
    uint256 private _nextTokenId;
    
    address public taskConsensus;
    address public taskRegistry;
    
    string private _baseTokenURI;
    
    enum TaskType {
        CLASSIFICATION,
        EXTRACTION,
        SCORING,
        PREDICTION,
        VERIFICATION
    }
    
    event ReceiptMinted(
        uint256 indexed tokenId,
        bytes32 indexed taskId,
        address indexed requester,
        bytes32 resultHash
    );
    
    modifier onlyConsensus() {
        require(msg.sender == taskConsensus, "Only TaskConsensus");
        _;
    }
    
    constructor() ERC721("ProofClaw Task Receipt", "RECEIPT") Ownable(msg.sender) {
        _nextTokenId = 1;
    }
    
    function setTaskConsensus(address _consensus) external onlyOwner {
        taskConsensus = _consensus;
    }
    
    function setTaskRegistry(address _registry) external onlyOwner {
        taskRegistry = _registry;
    }
    
    function setBaseURI(string calldata _uri) external onlyOwner {
        _baseTokenURI = _uri;
    }
    
    function mintReceipt(
        address _requester,
        bytes32 _taskId,
        bytes32 _resultHash,
        address[] calldata _providers,
        uint256 _agreementRatio,
        TaskType _taskType
    ) external onlyConsensus returns (uint256) {
        require(taskToToken[_taskId] == 0, "Receipt already minted");
        
        uint256 tokenId = _nextTokenId++;
        
        receipts[tokenId] = Receipt({
            taskId: _taskId,
            resultHash: _resultHash,
            consensusTimestamp: block.timestamp,
            providerIds: _providers,
            agreementRatio: _agreementRatio,
            taskType: _taskType
        });
        
        taskToToken[_taskId] = tokenId;
        
        _mint(_requester, tokenId);
        
        emit ReceiptMinted(tokenId, _taskId, _requester, _resultHash);
        
        return tokenId;
    }
    
    function getReceipt(uint256 _tokenId) external view returns (Receipt memory) {
        require(_exists(_tokenId), "Receipt does not exist");
        return receipts[_tokenId];
    }
    
    function getReceiptByTask(bytes32 _taskId) external view returns (Receipt memory) {
        uint256 tokenId = taskToToken[_taskId];
        require(tokenId != 0, "No receipt for this task");
        return receipts[tokenId];
    }
    
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        
        // Return metadata URI or generate on-chain metadata
        if (bytes(_baseTokenURI).length > 0) {
            return string(abi.encodePacked(_baseTokenURI, toString(tokenId)));
        }
        
        // Generate simple on-chain metadata
        Receipt memory receipt = receipts[tokenId];
        
        return string(abi.encodePacked(
            "data:application/json;base64,",
            _encodeMetadata(receipt)
        ));
    }
    
    function _encodeMetadata(Receipt memory _receipt) internal pure returns (string memory) {
        // Simple base64 encoding of JSON metadata
        // In production, use a proper base64 library
        return "";
    }
    
    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
    
    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
