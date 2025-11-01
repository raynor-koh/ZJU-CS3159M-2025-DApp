import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    ganache: {
      // rpc url, change it according to your ganache configuration
      url: 'http://localhost:8545',
      // the private key of signers, change it according to your ganache user
      accounts: [
        '0x451fd64f7ff0ec86e38bef36b9c0c5e6c6aee1014bc05f7d1b53625616a92e0e',
        '0x12ae7454ecbb0dd4a5428fcfea5437d0f9d904516047ac649c862a22bfcbd4f1',
        '0x33f5fea4b759e1fa0e369c85f385ecaf7f51df4795cac3abe6fd4faaabb8407e',
        '0x28182e00817a223bb8ade3f4fb5e8c4a0699b7c39e536e3d073c6a6dc515fa37',
        '0x2858d5c5144d6bad4319df66876b0feb032c6f2ed82173980192deaea398603b',
      ]
    },
  },
};

export default config;
