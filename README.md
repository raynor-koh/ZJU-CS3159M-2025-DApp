# 浙江大学 CS3159M ZJU-PolyMarket DApp

## 如何运行

1. 在本地启动ganache应用。把账户的私钥拷贝到`./contracts/hardhat.config.ts` 中 `accounts` 数组里。
![Hardhat config](./screenshots/hardhat_config.png)

2. 在 `./contracts` 中安装需要的依赖，运行如下的命令：

    ```bash
    npm install
    ```

3. 在 `./contracts` 中编译合约，运行如下的命令：

    ```bash
    npx hardhat clean
    npx hardhat compile
    npx hardhat run ./scripts/deploy.ts --network ganache
    ```

![`deploy.ts` output](screenshots/deploy_output.png)

4. 把以上的地址拷贝到 `./frontend/src/utils/contract-addresses.json`, i.e. 更新`./frontend/src/utils/contract-addresses.json`中合约的地址。

5. 把 `./contracts/artifacts/contracts/EasyBet.sol/EasyBet.json`、`./contracts/artifacts/contracts/EasyToken.sol/EasyToken.json` 和 `./contracts/artifacts/contracts/TicketNFT.sol/TicketNFT.json` 拷贝到 `./frontend/src/utils/abis`。

6. 在 `./frontend` 中安装需要的依赖，运行如下的命令：

    ```bash
    npm install
    ```

7. 在 `./frontend` 中启动前端程序，运行如下的命令：

    ```bash
    npm run build
    npm run start
    ```

8. 在游览器，打开 `localhost:3000`。

9. 在游览器设置 MetaMask。点击 `Import an account`, 然后输入Ganache区块链上账户的私钥。

![Add Wallet](./screenshots/metamask_add_wallet.png)
![Input Private Key](./screenshots/metamask_insert_private_key.png)

10. 把 `localhost:3000` 加上 Metamask Networks > Select Networks > Custom > Add Custom Network 上， 并与 `localhost:3000` 链接。

## 功能实现分析

简单描述：项目完成了要求的哪些功能？每个功能具体是如何实现的？

### 发行一个 ERC20 合约，允许用户领取 ERC20 积分，并使用ERC20积分完成上述流程

项目通过实现 `EasyToken.sol` 合约完成了 ERC20 代币的发行。该合约继承自 OpenZeppelin 的 `ERC20` 和 `Ownable` 标准合约，使用了经过安全审计的标准 ERC20 接口。合约的核心功能是允许每个用户免费领取一次测试代币。

为了防止用户重复领取，合约使用了 `mapping(address => bool) public hasClaimed` 来记录每个地址是否已经领取过代币。用户通过调用 `claim()` 函数可以一次性获得 100,000 个 EZT (EasyToken)。代币的总供应量没有上限，采用按需铸造（mint-on-demand）的方式，每当有新用户领取时，合约会即时铸造相应数量的代币。

```solidity
function claim() external {
    require(!hasClaimed[msg.sender], "Already claimed");
    hasClaimed[msg.sender] = true;
    _mint(msg.sender, CLAIM_AMOUNT); // 100000 * 10^18
}
```

在整个竞猜流程中，EasyToken 贯穿始终：管理员创建市场时使用 `transferFrom` 投入初始奖池，玩家购买彩票时支付 ERC20 代币，二级市场交易时买卖双方使用 ERC20 代币结算，最后获胜玩家领取的奖励也是 ERC20 代币。这种设计使得整个系统完全基于代币经济运转。

### 公证人可以创立许多竞猜项目，每个项目应当有2个或多个可能的选项，一定的彩票总金额，以及规定好的结果公布时间

竞猜市场的创建功能在 `EasyBet.sol` 合约中通过 `createMarket()` 函数实现。为了确保只有授权的公证人才能创建市场，合约使用了 OpenZeppelin 的 `AccessControl` 模块实现基于角色的访问控制（RBAC）。只有被授予 `ADMIN_ROLE` 的地址才能调用该函数。

每个竞猜市场使用 `Market` 结构体存储完整信息，包括标题、描述、公证人地址、奖池总金额、结果公布时间等。市场中的每个可选选项则通过 `Option` 结构体记录，包含选项名称、彩票价格、已售数量和总交易额。合约使用 `mapping(uint256 => Market) private markets` 存储所有市场，通过递增的 `marketCount` 作为市场ID。

```solidity
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

    if (prizePoolTokens > 0) {
        require(easyToken.transferFrom(msg.sender, address(this), prizePoolTokens), "transfer failed");
    }

    marketId = ++marketCount;
    Market storage m = markets[marketId];
    m.title = title;
    m.description = description;
    m.oracle = oracle;
    m.resolveAt = resolveAt;
    m.status = MarketStatus.Open;
    m.prizePoolTokens = prizePoolTokens;

    for (uint256 i = 0; i < optionLabels.length; i++) {
        m.options.push(Option({
            label: optionLabels[i],
            priceTokens: optionPricesTokens[i],
            tickets: 0,
            volumeTokens: 0
        }));
    }
}
```

创建市场时，如果公证人提供了初始奖池金额，合约会通过 `transferFrom` 将相应数量的 ERC20 代币从公证人账户转入合约地址。之后玩家购买彩票的费用也会累加到这个奖池中，最终在结算时分配给获胜者。

### 玩家领取到测试所需虚拟币（EasyToken）

玩家领取测试代币的功能与第一点描述的 `EasyToken.sol` 合约的 `claim()` 函数实现相同。从用户体验角度来看，前端应用会先调用 `hasClaimed(address)` 函数检查当前连接的钱包地址是否已经领取过代币。如果未领取，界面上会显示 "Claim Tokens" 按钮供用户点击。

当用户点击领取按钮时，前端会调用 `EasyToken.claim()` 函数，该函数会验证该地址之前没有领取过代币（通过 `require(!hasClaimed[msg.sender])` 检查），然后铸造 100,000 个 EZT 代币并发送给用户，同时将该地址标记为已领取状态。这个防重复领取机制使用的是链上 mapping 存储，所有状态永久保存在区块链上，无法被篡改或重置。

### 玩家都选择其中的某个选项并购买彩票，购买后获得一张对应的彩票凭证

购买彩票的功能通过 `EasyBet.sol` 中的 `buy()` 函数实现。当玩家购买彩票时，合约不仅会收取相应的 ERC20 代币，还会同时铸造一个 ERC721 NFT 作为彩票凭证发送给买家。这个 NFT 代表了玩家对该特定市场和选项的投注。

彩票 NFT 由独立的 `TicketNFT.sol` 合约管理，该合约基于 OpenZeppelin 的 `ERC721Enumerable` 标准实现，并使用 `AccessControl` 来限制只有具有 `MINTER_ROLE` 的地址（即 EasyBet 合约）才能铸造新的彩票。每个 NFT 内部存储了两个关键信息：`marketId`（所属市场）和 `optionId`（选择的选项），这些信息在结算时用于判断该彩票是否获胜。

```solidity
function buy(uint256 marketId, uint8 optionId) external nonReentrant returns (uint256 tokenId) {
    Market storage m = _mustMarket(marketId);
    require(m.status == MarketStatus.Open, "not open");
    require(optionId < m.options.length, "bad option");

    Option storage o = m.options[optionId];

    // 从买家转入ERC20代币到合约
    require(easyToken.transferFrom(msg.sender, address(this), o.priceTokens), "transfer failed");

    // 购买金额加入奖池
    m.prizePoolTokens += o.priceTokens;

    // 铸造NFT彩票凭证
    tokenId = ticket.mint(msg.sender, marketId, optionId);

    // 更新统计数据
    o.tickets += 1;
    o.volumeTokens += o.priceTokens;
    m.totalTickets += 1;

    emit TicketPurchased(marketId, optionId, tokenId, msg.sender, o.priceTokens);
}
```

整个购买流程分为几个步骤：首先验证市场处于开放状态且选项ID有效，然后通过 `transferFrom` 从买家账户转入相应数量的 ERC20 代币到合约地址，这些代币会立即加入奖池。接着调用 `ticket.mint()` 铸造一个新的 NFT 给买家，并更新市场和选项的统计数据。函数使用了 `nonReentrant` 修饰符防止重入攻击，确保交易的安全性。

### 在竞彩结果公布之前，任何玩家之间可以以指定的金额买卖他们的彩票，完成一次 ERC721 Token 交易

二级市场交易系统在 `EasyBet.sol` 中实现，提供了完整的挂单、取消挂单和购买功能。由于彩票是 ERC721 NFT，玩家实际上可以像交易其他 NFT 一样交易他们的彩票，而合约内置的市场功能为这种交易提供了便利和安全保障。

卖家通过 `listForSale()` 函数将自己持有的彩票挂单出售。函数首先验证调用者确实是该 NFT 的持有者，然后创建一个 `Listing` 结构体记录卖家地址和售价。同时，该挂单会被自动加入到订单簿系统中（下一节详述）。卖家在挂单前需要先调用 NFT 合约的 `setApprovalForAll()` 授权 EasyBet 合约可以转移其 NFT。

```solidity
function listForSale(uint256 tokenId, uint256 priceTokens) external {
    require(ticket.ownerOf(tokenId) == msg.sender, "not owner");

    // 如果已经挂单，先从旧价格等级移除
    Listing memory oldListing = listings[tokenId];
    if (oldListing.seller != address(0)) {
        TicketNFT.TicketInfo memory info = ticket.getTicketInfo(tokenId);
        _removeFromOrderBook(info.marketId, info.optionId, oldListing.priceTokens, tokenId);
    }

    // 创建新挂单
    listings[tokenId] = Listing({seller: msg.sender, priceTokens: priceTokens});

    // 加入订单簿
    TicketNFT.TicketInfo memory info = ticket.getTicketInfo(tokenId);
    orderBook[info.marketId][info.optionId][priceTokens].add(tokenId);
    priceLevels[info.marketId][info.optionId].add(priceTokens);

    emit Listed(tokenId, msg.sender, priceTokens);
}
```

买家通过 `buyListed()` 函数购买挂单的彩票。该函数使用 `nonReentrant` 修饰符防止重入攻击，在执行交易前会验证该彩票确实在售且买家不是卖家本人。交易分为三个原子步骤：首先从订单簿中移除该挂单，然后通过 `transferFrom` 将 ERC20 代币从买家转给卖家，最后通过 `safeTransferFrom` 将 NFT 从卖家转给买家。为了防止重入攻击，合约会在执行代币和 NFT 转移前先删除 `listings[tokenId]` 记录。

```solidity
function buyListed(uint256 tokenId) external nonReentrant {
    Listing memory l = listings[tokenId];
    require(l.seller != address(0), "not listed");
    require(l.seller != msg.sender, "cannot buy own ticket");

    TicketNFT.TicketInfo memory info = ticket.getTicketInfo(tokenId);
    _removeFromOrderBook(info.marketId, info.optionId, l.priceTokens, tokenId);

    delete listings[tokenId];

    // 买家向卖家支付ERC20代币
    require(easyToken.transferFrom(msg.sender, l.seller, l.priceTokens), "transfer failed");

    // NFT从卖家转移到买家
    ticket.safeTransferFrom(l.seller, msg.sender, tokenId);

    emit Bought(tokenId, l.seller, msg.sender, l.priceTokens);
}
```

卖家可以随时通过 `cancelListing()` 函数取消挂单。函数会验证调用者是该挂单的卖家，然后从订单簿中移除该挂单记录并删除 `listings` 映射中的条目。整个二级市场系统确保了交易的安全性和透明度，所有挂单和交易记录都永久保存在区块链上。

### 对交易彩票的过程实现一个简单的链上订单簿

订单簿系统是二级市场的核心组件，在 `EasyBet.sol` 中通过嵌套映射和 OpenZeppelin 的 `EnumerableSet` 数据结构实现。订单簿将所有挂单按照市场、选项和价格三个维度进行组织，使得买家可以快速查询特定市场选项的所有挂单并按价格排序。

订单簿使用两个核心数据结构：`orderBook` 是一个三维映射，存储了每个市场的每个选项在每个价格等级上的所有 tokenId 集合；`priceLevels` 是一个二维映射，记录了每个市场选项组合下所有有挂单的价格等级。使用 `EnumerableSet.UintSet` 而不是普通数组的好处是可以高效地进行添加、删除和枚举操作。

```solidity
// 订单簿数据结构
mapping(uint256 => mapping(uint8 => mapping(uint256 => EnumerableSet.UintSet))) private orderBook;
mapping(uint256 => mapping(uint8 => EnumerableSet.UintSet)) private priceLevels;
```

合约提供了三个主要的查询函数。`getOrderBookPriceLevels()` 返回特定市场选项的所有价格等级，并使用冒泡排序将价格按升序排列，使得买家可以从低到高查看所有挂单价格。`getOrderBookQuantityAtPrice()` 返回特定价格等级上的挂单数量。`getOrderBookTokensAtPrice()` 返回特定价格等级上的所有 tokenId，前端可以据此显示详细的挂单信息。

```solidity
function getOrderBookPriceLevels(uint256 marketId, uint8 optionId)
    external view returns (uint256[] memory prices)
{
    EnumerableSet.UintSet storage levels = priceLevels[marketId][optionId];
    uint256 len = levels.length();
    prices = new uint256[](len);

    for (uint256 i = 0; i < len; i++) {
        prices[i] = levels.at(i);
    }

    // 冒泡排序，升序排列
    for (uint256 i = 0; i < prices.length; i++) {
        for (uint256 j = i + 1; j < prices.length; j++) {
            if (prices[i] > prices[j]) {
                (prices[i], prices[j]) = (prices[j], prices[i]);
            }
        }
    }
}
```

为了提升用户体验，合约还实现了 `buyAtBestPrice()` 函数，允许买家一键购买最便宜的挂单。该函数会自动查询所有价格等级，从最低价开始遍历，并跳过卖家是买家本人的挂单，找到第一个可购买的挂单后立即执行交易。这种设计实现了类似传统交易所的"市价单"功能。

```solidity
function buyAtBestPrice(uint256 marketId, uint8 optionId)
    external nonReentrant returns (uint256 tokenId)
{
    EnumerableSet.UintSet storage levels = priceLevels[marketId][optionId];
    require(levels.length() > 0, "no listings");

    uint256[] memory sortedPrices = new uint256[](levels.length());
    for (uint256 i = 0; i < levels.length(); i++) {
        sortedPrices[i] = levels.at(i);
    }

    // 排序找到最低价
    for (uint256 i = 0; i < sortedPrices.length; i++) {
        for (uint256 j = i + 1; j < sortedPrices.length; j++) {
            if (sortedPrices[i] > sortedPrices[j]) {
                (sortedPrices[i], sortedPrices[j]) = (sortedPrices[j], sortedPrices[i]);
            }
        }
    }

    // 找到第一个不是自己挂单的票
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

    // 执行购买
    Listing memory l = listings[tokenId];
    _removeFromOrderBook(marketId, optionId, l.priceTokens, tokenId);
    delete listings[tokenId];
    require(easyToken.transferFrom(msg.sender, l.seller, l.priceTokens), "transfer failed");
    ticket.safeTransferFrom(l.seller, msg.sender, tokenId);
}
```

订单簿系统会自动维护其一致性。当某个价格等级的所有挂单都被买完或取消时，`_removeFromOrderBook()` 内部函数会自动将该价格从 `priceLevels` 中移除，确保查询结果始终准确。所有订单簿数据完全存储在链上，任何人都可以查询和验证，实现了完全的透明度和去中心化。

### 公证人在时间截止时输入竞猜的结果并进行结算，所有胜利玩家平分奖池中的金额

竞猜市场的结算和奖励发放通过两个函数实现：`resolve()` 负责结算市场并计算每张获胜彩票的奖励金额，`claimPayout()` 让获胜玩家领取奖励。这种两步设计将结算和领奖分离，避免了在结算时需要遍历所有获胜者进行转账，大大降低了 gas 消耗。

`resolve()` 函数只能由指定的 oracle 地址或具有 `ADMIN_ROLE` 的管理员调用。对于 oracle，合约会检查当前区块时间戳是否已经达到或超过市场设定的 `resolveAt` 时间；而管理员可以随时结算市场，这个设计是为了处理紧急情况（比如 oracle 失联）。结算时，函数会统计获胜选项的彩票总数，然后将奖池总金额除以获胜彩票数量，计算出每张获胜彩票的奖励金额。

```solidity
function resolve(uint256 marketId, uint8 winningOption) external {
    Market storage m = _mustMarket(marketId);
    require(msg.sender == m.oracle || hasRole(ADMIN_ROLE, msg.sender), "not oracle/admin");
    require(m.status == MarketStatus.Open, "already resolved");
    require(winningOption < m.options.length, "bad option");

    // oracle需要等到指定时间，admin可以随时结算
    if (m.resolveAt != 0 && !hasRole(ADMIN_ROLE, msg.sender)) {
        require(block.timestamp >= m.resolveAt, "too early");
    }

    m.status = MarketStatus.Resolved;
    m.winningOption = winningOption;

    // 计算获胜者数量和每张彩票的奖励
    m.winners = m.options[winningOption].tickets;
    require(m.winners > 0, "no winners");

    m.payoutPerTicketTokens = m.prizePoolTokens / m.winners;

    emit MarketResolved(marketId, winningOption, m.winners, m.payoutPerTicketTokens);
}
```

获胜玩家通过 `claimPayout()` 函数领取奖励。函数会进行多重验证：首先确认调用者是该 NFT 的当前持有者，然后检查该彩票是否已经领取过奖励（通过 `claimed` 映射记录），接着从 NFT 中读取市场ID和选项ID，验证市场已经结算且该彩票的选项是获胜选项。所有验证通过后，函数会标记该 tokenId 为已领取状态，并将计算好的奖励金额（`m.payoutPerTicketTokens`）以 ERC20 代币的形式转给调用者。

```solidity
function claimPayout(uint256 tokenId) external nonReentrant {
    require(ticket.ownerOf(tokenId) == msg.sender, "not owner");
    require(!claimed[tokenId], "already claimed");

    TicketNFT.TicketInfo memory info = ticket.getTicketInfo(tokenId);
    Market storage m = _mustMarket(info.marketId);
    require(m.status == MarketStatus.Resolved, "not resolved");
    require(info.optionId == m.winningOption, "losing ticket");

    claimed[tokenId] = true;

    require(easyToken.transfer(msg.sender, m.payoutPerTicketTokens), "transfer failed");

    emit Claimed(tokenId, msg.sender, m.payoutPerTicketTokens);
}
```

这个结算系统的一个重要特性是它完全支持二级市场交易。由于奖励是发放给 NFT 的当前持有者而不是原始购买者，如果玩家在结算前通过二级市场卖出了获胜彩票，新的持有者可以领取奖励；反之，如果玩家买入了他人的获胜彩票，也可以正常领奖。使用 `nonReentrant` 修饰符和在转账前标记 `claimed` 状态确保了领奖过程的安全性，防止了重入攻击和重复领取。整个平均分配机制确保了所有获胜者获得相等的奖励，体现了公平性原则。

## 项目运行截图

放一些项目运行截图。

项目运行成功的关键页面和流程截图。主要包括操作流程以及和区块链交互的截图。

### 起初状态

#### 钱包：

![Admin Metamask](./screenshots/initial/1.png)
![Player Metamask](./screenshots/initial/2.png)

#### 区块链：（账户、转账、区块）

![Ganache Accounts](./screenshots/initial/3.png)
![Ganache Blocks](./screenshots/initial/4.png)
![Ganache Transactions](./screenshots/initial/5.png)

#### 页面（`/`）：

![Admin Home Page](./screenshots/initial/6.png)
![Player Home Page](./screenshots/initial/7.png)

### 领EasyToken （EZT）：

我先用Admin领取EasyToken，再用Player_1领。

#### 钱包：

Admin:

![Admin Metamask Activity](./screenshots/claim/1.png)
![Admin Metamask Tokens](./screenshots/claim/2.png)

Player 1:

![Player Metamask Activity](./screenshots/claim/7.png)
![Player Metamask Tokens](./screenshots/claim/8.png)

#### 区块链：（账户、转账、区块）

Admin 0:

![Ganache Accounts](./screenshots/claim/3.png)
![Ganache Blocks](./screenshots/claim/4.png)
![Ganache Transactions](./screenshots/claim/5.png)

Player 1:

![Ganache Accounts](./screenshots/claim/9.png)
![Ganache Blocks](./screenshots/claim/10.png)
![Ganache Transactions](./screenshots/claim/11.png)

#### 页面（`/`）：

Admin:

![Home Page](./screenshots/claim/6.png)

Player 1:

![Home Page](./screenshots/claim/12.png)

### 创立竞猜项目

#### 钱包：

![Metamask Wallet Tokens](./screenshots/createMarket/3.png)
![Metamask Wallet Activity](./screenshots/createMarket/4.png)

#### 区块链：（账户、转账、区块）

![Ganache Accounts](./screenshots/createMarket/7.png)
![Ganache Blocks](./screenshots/createMarket/8.png)
![Ganache Transactions](./screenshots/createMarket/9.png)

#### 页面（`/admin`）：

只有 `admin` 才能创立项目:
![Completed Form](./screenshots/createMarket/1.png)

非 `admin` 无法创立项目:
![Non-admin restriction](./screenshots/createMarket/2.png)

刚创立的项目会出现在首页（`/`），也会出现在 `/admin` 页
![Home Page](./screenshots/createMarket/5.png)
![Admin Page](./screenshots/createMarket/6.png)

### 选择其中的某个选项并购买彩票，获得一张对应的彩票凭证

#### 钱包：

![Metamask Wallet Activity](./screenshots/buyPrimary/2.png)

#### 区块链：（账户、转账、区块）

![Ganache 1](./screenshots/buyPrimary/5.png)
![Ganache 2](./screenshots/buyPrimary/6.png)
![Ganache 3](./screenshots/buyPrimary/7.png)

#### 页面：

买彩票（`/market/[id]`）

![Market Page Before](./screenshots/buyPrimary/1.png)
![Market Page After](./screenshots/buyPrimary/3.png)

查看自己的彩票 （`/marketplace`）：

![Ticket Page](./screenshots/buyPrimary/4.png)

### 在竞彩结果公布之前出售彩票

#### 钱包：

![Metamask Activity](./screenshots/sellSecondary/3.png)

#### 区块链：（账户、转账、区块）

![Ganache 1](./screenshots/sellSecondary/6.png)
![Ganache 2](./screenshots/sellSecondary/7.png)
![Ganache 3](./screenshots/sellSecondary/8.png)

#### 页面（`/marketplace`）：

前：

![Ticket Page](./screenshots/sellSecondary/1.png)
![Marketplace Page](./screenshots/sellSecondary/2.png)

后：

![Ticket Page](./screenshots/sellSecondary/4.png)
![Marketplace Page](./screenshots/sellSecondary/5.png)


### 在竞彩结果公布之前买别的玩家的彩票

#### 钱包：

Player 1:

![Metamask Activity Player 1](./screenshots/buySecondary/3.png)
![Metamask Activity Player 1](./screenshots/buySecondary/4.png)

Admin:

![Metamask Wallet Activity](./screenshots/sellSecondary/3.png)
![Metamask Wallet Activity](./screenshots/buySecondary/9.png)

#### 区块链：（账户、转账、区块）

![Ganache 1](./screenshots/buySecondary/10.png)
![Ganache 2](./screenshots/buySecondary/11.png)
![Ganache 3](./screenshots/buySecondary/12.png)

#### 页面（`/marketplace`）：

前：

Player 1:

![Marketplace Page](./screenshots/buySecondary/1.png)
![Ticket Page](./screenshots/buySecondary/2.png)

Admin:

![Marketplace Page](./screenshots/sellSecondary/5.png)
![Ticket Page](./screenshots/sellSecondary/4.png)

后：

Player 1:

![Marketplace Page](./screenshots/buySecondary/5.png)
![Ticket Page](./screenshots/buySecondary/6.png)

Admin:

![Marketplace Page](./screenshots/buySecondary/7.png)
![Ticket Page](./screenshots/buySecondary/8.png)

### 公证人输入项目结果

#### 钱包：

![Metamask Wallet Activity](./screenshots/buySecondary/9.png)
![Metamask Wallet Activity](./screenshots/resolveMarket/3.png)

#### 区块链：（账户、转账、区块）

![Ganache](./screenshots/resolveMarket/6.png)
![Ganache](./screenshots/resolveMarket/7.png)
![Ganache](./screenshots/resolveMarket/8.png)

#### 页面

前：

![Admin Page](./screenshots/resolveMarket/1.png)
![Admin Page](./screenshots/resolveMarket/2.png)

后：

![Admin Page](./screenshots/resolveMarket/4.png)
![Admin Page](./screenshots/resolveMarket/5.png)

### 胜利玩家领金额

#### 钱包：

前：

![Metamask](./screenshots/reward/2.png)

后：

![Metamask](./screenshots/reward/3.png)

#### 区块链：（账户、转账、区块）

![Ganache](./screenshots/reward/5.png)
![Ganache](./screenshots/reward/6.png)
![Ganache](./screenshots/reward/7.png)

#### 页面 （`/market/[id]`）

前：

![Market Page](./screenshots/reward/1.png)

后：

![Market Page](./screenshots/reward/4.png)

### 订单簿

### 钱包

![Wallet](./screenshots/orderBook/1.png)

#### 区块链

![Ganache](./screenshots/orderBook/3.png)
![Ganache](./screenshots/orderBook/4.png)
![Ganache](./screenshots/orderBook/5.png)

#### 页面

![OrderBook Page](./screenshots/orderBook/2.png)

## 参考内容

- 课程的参考Demo见：[DEMOs](https://github.com/LBruyne/blockchain-course-demos)。

- 快速实现 ERC721 和 ERC20：[模版](https://wizard.openzeppelin.com/#erc20)。记得安装相关依赖 ``"@openzeppelin/contracts": "^5.0.0"``。

- 如何实现ETH和ERC20的兑换？ [参考讲解](https://www.wtf.academy/en/docs/solidity-103/DEX/)
