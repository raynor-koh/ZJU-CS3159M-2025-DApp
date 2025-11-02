import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // 1) Deploy EasyToken first (no constructor args)
  const EasyToken = await ethers.getContractFactory("EasyToken");
  const easyToken = await EasyToken.deploy();
  await easyToken.deployed();
  console.log(`EasyToken deployed to: ${easyToken.address}`);

  // 2) Deploy EasyBet with (admin, easyToken)
  // Note: EasyBet constructor creates its own TicketNFT instance internally
  const EasyBet = await ethers.getContractFactory("EasyBet");
  const easyBet = await EasyBet.deploy(deployer.address, easyToken.address);
  await easyBet.deployed();
  console.log(`EasyBet deployed to: ${easyBet.address}`);

  // 3) Get the actual TicketNFT address created by EasyBet
  const ticketNFTAddress = await easyBet.ticket();
  console.log(`TicketNFT deployed to: ${ticketNFTAddress}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
