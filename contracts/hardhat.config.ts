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
        '0xd3543085b596e77b9d7a46e3799b49a0c88df5731981711a9a92b1ba3e4276fb',
        '0x026a137d8b27cd1ccfe66cce798f272fae9b92cfb3849eb10d48a4d8e234c1d5',
        '0xce1c887ef7124bab80cad169f50cd682f0c32955b474d7348afb7003ebfbf9ce',
        '0x489f40b84fe1ec211df3838f152f18aafdd068573f855e65d499273eb84bf9b7',
      ]
    },
  },
};

export default config;
