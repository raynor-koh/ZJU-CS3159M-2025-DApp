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

### 公证人可以创立许多竞猜项目，每个项目应当有2个或多个可能的选项，一定的彩票总金额，以及规定好的结果公布时间

### 玩家领取到测试所需虚拟币（EasyToken）

### 玩家都选择其中的某个选项并购买彩票，购买后获得一张对应的彩票凭证

### 在竞彩结果公布之前，任何玩家之间可以以指定的金额买卖他们的彩票，完成一次 ERC721 Token 交易

### 对交易彩票的过程实现一个简单的链上订单簿

### 公证人在时间截止时输入竞猜的结果并进行结算，所有胜利玩家平分奖池中的金额

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

如果有其它参考的内容，也请在这里陈列。
