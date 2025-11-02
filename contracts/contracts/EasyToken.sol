// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

/**
 * @title EasyToken
 * @dev ERC20 token that users can claim once for free.
 *      Infinite total supply (mint-on-demand).
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EasyToken is ERC20, Ownable{

    mapping(address => bool) public hasClaimed;
    uint256 public constant CLAIM_AMOUNT = 1000 * 10 ** 18;

    constructor() ERC20("EasyToken", "EZT") Ownable(msg.sender) {}

    /**
     * @dev Allow any user to claim their free tokens once.
     */
    function claim() external {
        require(!hasClaimed[msg.sender], "Already claimed");
        hasClaimed[msg.sender] = true;

        _mint(msg.sender, CLAIM_AMOUNT);
    }
}