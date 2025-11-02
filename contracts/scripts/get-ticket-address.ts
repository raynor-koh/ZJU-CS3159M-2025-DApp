import { ethers } from "hardhat";

const addrs = {
  easyBet: "0x50cC1AdF9cC4a19d0902c2800C22279bA03601Df",
};

async function main() {
  const EasyBet = await ethers.getContractAt("EasyBet", addrs.easyBet);
  const ticketAddress = await EasyBet.ticket();
  console.log("Actual TicketNFT address used by EasyBet:", ticketAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
