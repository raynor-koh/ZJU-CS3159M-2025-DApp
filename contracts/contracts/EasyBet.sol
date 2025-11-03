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
        uint256 priceTokens;  // Secondary market uses ERC20 tokens
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

    // Order book: (marketId, optionId, price) => set of tokenIds
    mapping(uint256 => mapping(uint8 => mapping(uint256 => EnumerableSet.UintSet))) private orderBook;

    // Track all unique price levels for each (marketId, optionId)
    mapping(uint256 => mapping(uint8 => EnumerableSet.UintSet)) private priceLevels;

    event MarketCreated(uint256 indexed marketId, string title, uint256 prizePoolTokens);
    event TicketPurchased(uint256 indexed marketId, uint8 indexed optionId, uint256 indexed tokenId, address buyer, uint256 priceTokens);
    event Listed(uint256 indexed tokenId, address seller, uint256 priceTokens);
    event Unlisted(uint256 indexed tokenId);
    event Bought(uint256 indexed tokenId, address seller, address buyer, uint256 priceTokens);
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

        // Transfer prize pool from admin (only if non-zero)
        if (prizePoolTokens > 0) {
            require(
                easyToken.transferFrom(msg.sender, address(this), prizePoolTokens),
                "transfer failed"
            );
        }

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

    // --------- Simple listing / trading (uses ERC20 tokens for secondary market) ----------

    function listForSale(uint256 tokenId, uint256 priceTokens) external {
        require(ticket.ownerOf(tokenId) == msg.sender, "not owner");

        // Get ticket info for order book indexing
        TicketNFT.TicketInfo memory info = ticket.getTicketInfo(tokenId);

        // Remove from old price level if already listed
        Listing memory oldListing = listings[tokenId];
        if (oldListing.seller != address(0)) {
            _removeFromOrderBook(info.marketId, info.optionId, oldListing.priceTokens, tokenId);
        }

        // Create new listing
        listings[tokenId] = Listing({seller: msg.sender, priceTokens: priceTokens});

        // Add to order book
        orderBook[info.marketId][info.optionId][priceTokens].add(tokenId);
        priceLevels[info.marketId][info.optionId].add(priceTokens);

        emit Listed(tokenId, msg.sender, priceTokens);
    }

    function cancelListing(uint256 tokenId) external {
        Listing memory l = listings[tokenId];
        require(l.seller == msg.sender, "not seller");

        // Get ticket info for order book
        TicketNFT.TicketInfo memory info = ticket.getTicketInfo(tokenId);

        // Remove from order book
        _removeFromOrderBook(info.marketId, info.optionId, l.priceTokens, tokenId);

        delete listings[tokenId];
        emit Unlisted(tokenId);
    }

    function buyListed(uint256 tokenId) external nonReentrant {
        Listing memory l = listings[tokenId];
        require(l.seller != address(0), "not listed");
        require(l.seller != msg.sender, "cannot buy own ticket");

        // Get ticket info for order book
        TicketNFT.TicketInfo memory info = ticket.getTicketInfo(tokenId);

        // Remove from order book
        _removeFromOrderBook(info.marketId, info.optionId, l.priceTokens, tokenId);

        // clear listing first to avoid re-entrancy issues
        delete listings[tokenId];

        // Transfer ERC20 tokens from buyer to seller
        require(
            easyToken.transferFrom(msg.sender, l.seller, l.priceTokens),
            "transfer failed"
        );

        // transfer NFT from seller to buyer
        address seller = l.seller;
        ticket.safeTransferFrom(seller, msg.sender, tokenId);

        emit Bought(tokenId, seller, msg.sender, l.priceTokens);
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

    // --------- Order Book Functions ----------

    /**
     * Get all price levels for a specific market option, sorted ascending
     */
    function getOrderBookPriceLevels(uint256 marketId, uint8 optionId)
        external
        view
        returns (uint256[] memory prices)
    {
        EnumerableSet.UintSet storage levels = priceLevels[marketId][optionId];
        uint256 len = levels.length();
        prices = new uint256[](len);

        for (uint256 i = 0; i < len; i++) {
            prices[i] = levels.at(i);
        }

        // Sort prices ascending (simple bubble sort, good enough for small arrays)
        for (uint256 i = 0; i < prices.length; i++) {
            for (uint256 j = i + 1; j < prices.length; j++) {
                if (prices[i] > prices[j]) {
                    (prices[i], prices[j]) = (prices[j], prices[i]);
                }
            }
        }
    }

    /**
     * Get quantity of tickets available at a specific price level
     */
    function getOrderBookQuantityAtPrice(uint256 marketId, uint8 optionId, uint256 price)
        external
        view
        returns (uint256)
    {
        return orderBook[marketId][optionId][price].length();
    }

    /**
     * Get all token IDs at a specific price level
     */
    function getOrderBookTokensAtPrice(uint256 marketId, uint8 optionId, uint256 price)
        external
        view
        returns (uint256[] memory tokenIds)
    {
        EnumerableSet.UintSet storage tokens = orderBook[marketId][optionId][price];
        uint256 len = tokens.length();
        tokenIds = new uint256[](len);

        for (uint256 i = 0; i < len; i++) {
            tokenIds[i] = tokens.at(i);
        }
    }

    /**
     * Buy ticket at the best (lowest) price for a given market option
     * Automatically skips the buyer's own listings
     */
    function buyAtBestPrice(uint256 marketId, uint8 optionId) external nonReentrant returns (uint256 tokenId) {
        EnumerableSet.UintSet storage levels = priceLevels[marketId][optionId];
        require(levels.length() > 0, "no listings");

        // Sort price levels to find best prices
        uint256[] memory sortedPrices = new uint256[](levels.length());
        for (uint256 i = 0; i < levels.length(); i++) {
            sortedPrices[i] = levels.at(i);
        }

        // Bubble sort ascending
        for (uint256 i = 0; i < sortedPrices.length; i++) {
            for (uint256 j = i + 1; j < sortedPrices.length; j++) {
                if (sortedPrices[i] > sortedPrices[j]) {
                    (sortedPrices[i], sortedPrices[j]) = (sortedPrices[j], sortedPrices[i]);
                }
            }
        }

        // Find first token not owned by buyer
        bool found = false;
        for (uint256 priceIdx = 0; priceIdx < sortedPrices.length; priceIdx++) {
            uint256 price = sortedPrices[priceIdx];
            EnumerableSet.UintSet storage tokensAtPrice = orderBook[marketId][optionId][price];

            for (uint256 i = 0; i < tokensAtPrice.length(); i++) {
                uint256 candidateTokenId = tokensAtPrice.at(i);
                Listing memory listing = listings[candidateTokenId];

                if (listing.seller != address(0) && listing.seller != msg.sender) {
                    tokenId = candidateTokenId;
                    found = true;
                    break;
                }
            }

            if (found) break;
        }

        require(found, "no listings from other sellers");

        // Buy the found token
        Listing memory l = listings[tokenId];

        // Remove from order book
        _removeFromOrderBook(marketId, optionId, l.priceTokens, tokenId);

        // Clear listing
        delete listings[tokenId];

        // Transfer ERC20 tokens from buyer to seller
        require(
            easyToken.transferFrom(msg.sender, l.seller, l.priceTokens),
            "transfer failed"
        );

        // Transfer NFT from seller to buyer
        address seller = l.seller;
        ticket.safeTransferFrom(seller, msg.sender, tokenId);

        emit Bought(tokenId, seller, msg.sender, l.priceTokens);
    }

    // --------- Helpers ----------

    function _removeFromOrderBook(uint256 marketId, uint8 optionId, uint256 price, uint256 tokenId) internal {
        orderBook[marketId][optionId][price].remove(tokenId);

        // If no more tokens at this price, remove the price level
        if (orderBook[marketId][optionId][price].length() == 0) {
            priceLevels[marketId][optionId].remove(price);
        }
    }

    function _mustMarket(uint256 marketId) internal view returns (Market storage) {
        Market storage m = markets[marketId];
        require(m.exists, "no market");
        return m;
    }
}