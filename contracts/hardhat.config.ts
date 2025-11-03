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
        '0x0446de798faf921d1f00a2bae98097e92282323e3f827a98afcde1394094dd10',
        '0x4bd97452fa39c30b8db699f8c779e85f1fc519411099b42fb5b6e1799017e9fe',
        '0xd68b3ea94ca6b796b907fc647906fb3b1a9957a036cb693990114f6de9f12c99',
        '0xa15266580d2635d7c551220494c57dd021e31e56ca62588327dc37ebc4e59bea',
        '0x0fdbb79ec63e67bc143fb986b9ae670302df700010029b147836bceb8f2bb721',
        '0x0fa8b21b0da731a842a472fa15bd8241e5aef443935731ab73f288b77562341a'
      ]
    },
  },
};

export default config;
