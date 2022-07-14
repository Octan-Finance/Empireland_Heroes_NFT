const { ethers } = require("hardhat");
const delay = ms => new Promise(res => setTimeout(res, ms));

async function main() {
    const [admin] = await ethers.getSigners();
  
    console.log("Admin account:", admin.address);
    console.log("Account balance:", (await admin.getBalance()).toString());

    //  Deploy EPLHeroes contract
    console.log('Deploy EPLHeroes Contract .........');
    const Gov = '';
    const baseURI = 'https://empire-land.io/nft/heroes/';

    const EPLHeroes = await ethers.getContractFactory('EPLHeroes', admin);
    const heroes = await EPLHeroes.deploy(Gov, baseURI);
    await heroes.deployed();

    console.log('EPLHeroes Contract: ', heroes.address);

    //  Set Rental contract
    console.log('Set Rental contract .........');
    const Rental = '';
    await heroes.connect(admin).setRental(Rental);

    console.log('\n===== DONE =====')
}
  
main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
});