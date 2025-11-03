import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    ganache: {
      // rpc url, change it according to your ganache configuration
      url: 'http://localhost:8545',
      // the private key of signers, change it according to your ganache user
      accounts: [
        '0xd6a652ea6de7d7190f565902050924af2566f009400f1390ce3ed55a6962a323',
        '0xc9fdabb64b56f530bc803a451364b6a27177830507859df0de86fd7715b0352e',
        '0x9ad2375e9cccb78efe8393fa5c23e24b5c37592bd1f738603ac441ee352e973c',
      ]
    },
  },
};

export default config;
