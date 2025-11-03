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

建议分点列出。

## 项目运行截图

放一些项目运行截图。

项目运行成功的关键页面和流程截图。主要包括操作流程以及和区块链交互的截图。

## 参考内容

- 课程的参考Demo见：[DEMOs](https://github.com/LBruyne/blockchain-course-demos)。

- 快速实现 ERC721 和 ERC20：[模版](https://wizard.openzeppelin.com/#erc20)。记得安装相关依赖 ``"@openzeppelin/contracts": "^5.0.0"``。

- 如何实现ETH和ERC20的兑换？ [参考讲解](https://www.wtf.academy/en/docs/solidity-103/DEX/)

如果有其它参考的内容，也请在这里陈列。
