// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./TicketNFT.sol";

contract EasyBet is AccessControl, ReentrancyGuard {
    using EnumerableSet for EnumerableSet.UintSet;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    enum MarketStatus { Open, Resolved }

    struct Option {
        string label;
        uint256 priceTokens;   // price per ticket in ERC20 tokens
        uint256 tickets;       // how many tickets minted for this option
        uint256 volumeTokens;  // total volume for this option in tokens
    }

    struct Market {
        string title;
        string description;
        address oracle;
        uint256 prizePoolTokens;    // initial prize pool funded by admin (in ERC20)
        uint64 resolveAt;           // timestamp (0 if unset)
        MarketStatus status;
        uint8 winningOption;        // valid only when resolved
        Option[] options;
        bool exists;
        // accounting
        uint256 totalTickets;       // across all options
        uint256 winners;            // # of winning tickets after resolution
        uint256 payoutPerTicketTokens; // computed at resolution
    }

    struct Listing {
        address seller;
        uint256 priceWei;  // Secondary market uses ETH for simplicity
    }

    TicketNFT public immutable ticket;
    IERC20 public immutable easyToken;
    uint256 public marketCount;

    // marketId => Market
    mapping(uint256 => Market) private markets;

    // tokenId => Listing
    mapping(uint256 => Listing) public listings;

    // tokenId => claimed?
    mapping(uint256 => bool) public claimed;

    // index of winning tickets per market (optional)
    mapping(uint256 => EnumerableSet.UintSet) private _winningTokens;

    event MarketCreated(uint256 indexed marketId, string title, uint256 prizePoolTokens);
    event TicketPurchased(uint256 indexed marketId, uint8 indexed optionId, uint256 indexed tokenId, address buyer, uint256 priceTokens);
    event Listed(uint256 indexed tokenId, address seller, uint256 priceWei);
    event Unlisted(uint256 indexed tokenId);
    event Bought(uint256 indexed tokenId, address seller, address buyer, uint256 priceWei);
    event MarketResolved(uint256 indexed marketId, uint8 winningOption, uint256 winners, uint256 payoutPerTicketTokens);
    event Claimed(uint256 indexed tokenId, address claimer, uint256 amountTokens);

    constructor(address admin, address _easyToken) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        easyToken = IERC20(_easyToken);
        ticket = new TicketNFT(address(this));
        // grant EasyBet permission to mint tickets
        ticket.grantRole(ticket.MINTER_ROLE(), address(this));
    }

    // --------- Admin / Market creation ----------

    function createMarket(
        string memory title,
        string memory description,
        address oracle,
        uint64 resolveAt,
        string[] memory optionLabels,
        uint256[] memory optionPricesTokens,
        uint256 prizePoolTokens
    ) external onlyRole(ADMIN_ROLE) returns (uint256 marketId) {
        require(optionLabels.length >= 2, "need 2+ options");
        require(optionLabels.length == optionPricesTokens.length, "length mismatch");
        require(prizePoolTokens > 0, "prize pool must be > 0");

        // Transfer prize pool from admin
        require(
            easyToken.transferFrom(msg.sender, address(this), prizePoolTokens),
            "transfer failed"
        );

        marketId = ++marketCount;
        Market storage m = markets[marketId];
        m.title = title;
        m.description = description;
        m.oracle = oracle;
        m.resolveAt = resolveAt;
        m.status = MarketStatus.Open;
        m.exists = true;
        m.prizePoolTokens = prizePoolTokens;

        for (uint256 i = 0; i < optionLabels.length; i++) {
            m.options.push(Option({
                label: optionLabels[i],
                priceTokens: optionPricesTokens[i],
                tickets: 0,
                volumeTokens: 0
            }));
        }

        emit MarketCreated(marketId, title, prizePoolTokens);
    }

    // --------- View / Reads ----------

    function getMarket(uint256 marketId) external view returns (
        string memory title,
        string memory description,
        address oracle,
        uint256 prizePoolTokens,
        uint64 resolveAt,
        MarketStatus status,
        uint8 winningOption,
        uint256 totalTickets
    ) {
        Market storage m = _mustMarket(marketId);
        return (m.title, m.description, m.oracle, m.prizePoolTokens, m.resolveAt, m.status, m.winningOption, m.totalTickets);
    }

    function getOptions(uint256 marketId) external view returns (Option[] memory) {
        Market storage m = _mustMarket(marketId);
        return m.options;
    }

    // --------- Buy / Mint ticket ----------

    function buy(uint256 marketId, uint8 optionId) external nonReentrant returns (uint256 tokenId) {
        Market storage m = _mustMarket(marketId);
        require(m.status == MarketStatus.Open, "not open");
        require(optionId < m.options.length, "bad option");

        Option storage o = m.options[optionId];

        // Transfer tokens from buyer to contract
        require(
            easyToken.transferFrom(msg.sender, address(this), o.priceTokens),
            "transfer failed"
        );

        // Funds go into prize pool
        m.prizePoolTokens += o.priceTokens;

        tokenId = ticket.mint(msg.sender, marketId, optionId);

        o.tickets += 1;
        o.volumeTokens += o.priceTokens;
        m.totalTickets += 1;

        emit TicketPurchased(marketId, optionId, tokenId, msg.sender, o.priceTokens);
    }

    // --------- Simple listing / trading (uses ETH for secondary market) ----------

    function listForSale(uint256 tokenId, uint256 priceWei) external {
        require(ticket.ownerOf(tokenId) == msg.sender, "not owner");
        listings[tokenId] = Listing({seller: msg.sender, priceWei: priceWei});
        emit Listed(tokenId, msg.sender, priceWei);
    }

    function cancelListing(uint256 tokenId) external {
        Listing memory l = listings[tokenId];
        require(l.seller == msg.sender, "not seller");
        delete listings[tokenId];
        emit Unlisted(tokenId);
    }

    function buyListed(uint256 tokenId) external payable nonReentrant {
        Listing memory l = listings[tokenId];
        require(l.seller != address(0), "not listed");
        require(msg.value == l.priceWei, "bad price");

        // clear listing first to avoid re-entrancy issues
        delete listings[tokenId];

        // pay seller
        (bool ok, ) = l.seller.call{value: msg.value}("");
        require(ok, "pay fail");

        // transfer token
        address seller = l.seller;
        ticket.safeTransferFrom(seller, msg.sender, tokenId);

        emit Bought(tokenId, seller, msg.sender, msg.value);
    }

    // --------- Resolve & Claim (equal split) ----------

    function resolve(uint256 marketId, uint8 winningOption) external {
        Market storage m = _mustMarket(marketId);
        require(msg.sender == m.oracle || hasRole(ADMIN_ROLE, msg.sender), "not oracle/admin");
        require(m.status == MarketStatus.Open, "already resolved");
        require(winningOption < m.options.length, "bad option");

        // Only enforce resolveAt timestamp for oracle; admins can resolve anytime
        if (m.resolveAt != 0 && !hasRole(ADMIN_ROLE, msg.sender)) {
            require(block.timestamp >= m.resolveAt, "too early");
        }

        m.status = MarketStatus.Resolved;
        m.winningOption = winningOption;

        // Count winners
        m.winners = m.options[winningOption].tickets;
        require(m.winners > 0, "no winners");

        m.payoutPerTicketTokens = m.prizePoolTokens / m.winners;

        emit MarketResolved(marketId, winningOption, m.winners, m.payoutPerTicketTokens);
    }

    function claimPayout(uint256 tokenId) external nonReentrant {
        require(ticket.ownerOf(tokenId) == msg.sender, "not owner");
        require(!claimed[tokenId], "already claimed");

        TicketNFT.TicketInfo memory info = ticket.getTicketInfo(tokenId);
        Market storage m = _mustMarket(info.marketId);
        require(m.status == MarketStatus.Resolved, "not resolved");
        require(info.optionId == m.winningOption, "losing ticket");

        claimed[tokenId] = true;

        // Transfer ERC20 tokens
        require(
            easyToken.transfer(msg.sender, m.payoutPerTicketTokens),
            "transfer failed"
        );

        emit Claimed(tokenId, msg.sender, m.payoutPerTicketTokens);
    }

    // --------- Helpers ----------

    function _mustMarket(uint256 marketId) internal view returns (Market storage) {
        Market storage m = markets[marketId];
        require(m.exists, "no market");
        return m;
    }
}