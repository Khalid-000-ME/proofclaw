// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ProofToken
 * @notice ERC-20 PROOF token earned by providers for correct task completion
 */
contract ProofToken is ERC20, Ownable {
    
    address public taskConsensus;
    address public minter;
    
    uint8 private constant _DECIMALS = 8;
    uint256 public constant MAX_SUPPLY = 100_000_000 * 10**8; // 100 million PROOF
    
    mapping(address => bool) public authorizedMinters;
    
    uint256 public totalMinted;
    
    event MinterAdded(address indexed minter);
    event MinterRemoved(address indexed minter);
    event TokensMinted(address indexed to, uint256 amount);
    
    modifier onlyMinter() {
        require(
            msg.sender == taskConsensus || 
            msg.sender == minter || 
            authorizedMinters[msg.sender] ||
            msg.sender == owner(),
            "Not authorized to mint"
        );
        _;
    }
    
    constructor() ERC20("ProofClaw Token", "PROOF") Ownable(msg.sender) {
        // Initial supply: 0 - minted as providers complete tasks
    }
    
    function decimals() public pure override returns (uint8) {
        return _DECIMALS;
    }
    
    function setTaskConsensus(address _consensus) external onlyOwner {
        taskConsensus = _consensus;
    }
    
    function setMinter(address _minter) external onlyOwner {
        minter = _minter;
    }
    
    function addMinter(address _minter) external onlyOwner {
        authorizedMinters[_minter] = true;
        emit MinterAdded(_minter);
    }
    
    function removeMinter(address _minter) external onlyOwner {
        authorizedMinters[_minter] = false;
        emit MinterRemoved(_minter);
    }
    
    function mint(address _to, uint256 _amount) external onlyMinter {
        require(totalMinted + _amount <= MAX_SUPPLY, "Max supply exceeded");
        
        totalMinted += _amount;
        _mint(_to, _amount);
        
        emit TokensMinted(_to, _amount);
    }
    
    function batchMint(address[] calldata _recipients, uint256[] calldata _amounts) external onlyMinter {
        require(_recipients.length == _amounts.length, "Length mismatch");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < _amounts.length; i++) {
            totalAmount += _amounts[i];
        }
        
        require(totalMinted + totalAmount <= MAX_SUPPLY, "Max supply exceeded");
        
        totalMinted += totalAmount;
        
        for (uint256 i = 0; i < _recipients.length; i++) {
            _mint(_recipients[i], _amounts[i]);
            emit TokensMinted(_recipients[i], _amounts[i]);
        }
    }
    
    function burn(uint256 _amount) external {
        _burn(msg.sender, _amount);
    }
    
    function getMaxSupply() external pure returns (uint256) {
        return MAX_SUPPLY;
    }
    
    function getRemainingSupply() external view returns (uint256) {
        return MAX_SUPPLY - totalMinted;
    }
}
