// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract TicketNFT is ERC721Enumerable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    struct TicketInfo {
        uint256 marketId;
        uint8 optionId;
    }

    mapping(uint256 => TicketInfo) public ticketInfo;
    uint256 private _nextId = 1;

    constructor(address admin) ERC721("EasyBet Ticket", "EBT") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function mint(
        address to,
        uint256 marketId,
        uint8 optionId
    ) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        tokenId = _nextId++;
        _safeMint(to, tokenId);
        ticketInfo[tokenId] = TicketInfo({
            marketId: marketId,
            optionId: optionId
        });
    }

    function tokensOfOwner(
        address owner
    ) external view returns (uint256[] memory) {
        uint256 n = balanceOf(owner);
        uint256[] memory ids = new uint256[](n);
        for (uint256 i = 0; i < n; i++) ids[i] = tokenOfOwnerByIndex(owner, i);
        return ids;
    }

    // 👇 Add this override to fix the compiler error
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721Enumerable, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function getTicketInfo(
        uint256 tokenId
    ) external view returns (TicketInfo memory) {
        return ticketInfo[tokenId];
    }
}
