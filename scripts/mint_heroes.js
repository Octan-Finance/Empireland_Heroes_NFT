const { ethers } = require("hardhat");
const abi = require('../build/artifacts/contracts/EPLHeroes.sol/EPLHeroes.json').abi;

async function main() {
    const [admin] = await ethers.getSigners();

    console.log("Admin account:", admin.address);
    console.log("Account balance:", (await admin.getBalance()).toString());

    const provider = ethers.getDefaultProvider(process.env.FANTOM_TESTNET_PROVIDER);
    const HeroesAddr = '';
    const heroes = new ethers.Contract(HeroesAddr, abi, provider);

    const fromID = 120;
    const amount = 80;
    let tx = await heroes.connect(admin).breed(admin.address, fromID, amount);
    await tx.wait();

    console.log('\n===== DONE =====')
}
  
main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
});