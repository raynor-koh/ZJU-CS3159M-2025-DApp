import { ethers } from "hardhat";

const addrs = {
  easyBet: "0x50cC1AdF9cC4a19d0902c2800C22279bA03601Df",
  easyToken: "0x0be341cef20D48346d6efC141b7795C3EECac64a",
  ticketNFT: "0xc15A9e19DB6A6d15c42BAFd68ab9d06Ba0ee3021"
};

async function main() {
  console.log("\n=== BLOCKCHAIN DIAGNOSTIC ===\n");

  const [deployer] = await ethers.getSigners();
  console.log("Checking with address:", deployer.address);

  const EasyBet = await ethers.getContractAt("EasyBet", addrs.easyBet);
  const TicketNFT = await ethers.getContractAt("TicketNFT", addrs.ticketNFT);

  // Check market count
  const marketCount = await EasyBet.marketCount();
  console.log("\nTotal markets:", marketCount.toString());

  if (Number(marketCount) > 0) {
    // Check each market
    for (let i = 1; i <= Number(marketCount); i++) {
      try {
        const market = await EasyBet.getMarket(i);
        console.log(`\n--- Market ${i} ---`);
        console.log("Title:", market[0]);
        console.log("Status:", market[5] === 0 ? "Open" : "Resolved");
        console.log("Total tickets:", market[7].toString());

        if (market[5] === 1) {
          console.log("Winning option:", market[6].toString());
        }

        // Check who owns tickets for this market
        console.log("\nChecking ticket ownership...");

        let foundTickets = 0;
        // Try to check tickets 1-100 (arbitrary limit)
        for (let tokenId = 1; tokenId <= 100; tokenId++) {
          try {
            const owner = await TicketNFT.ownerOf(tokenId);
            const ticketInfo = await TicketNFT.getTicketInfo(tokenId);
            if (Number(ticketInfo.marketId) === i) {
              console.log(`  Ticket #${tokenId}: owned by ${owner}, option ${ticketInfo.optionId}`);
              foundTickets++;
            }
          } catch (e) {
            // Token doesn't exist, continue checking
          }
        }

        if (foundTickets === 0) {
          console.log("  WARNING: No tickets found! Tickets may not have been minted.");
        } else {
          console.log(`  Total tickets found: ${foundTickets}`);
        }
      } catch (e: any) {
        console.log(`Market ${i} does not exist`);
      }
    }
  }

  console.log("\n=== END DIAGNOSTIC ===\n");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
