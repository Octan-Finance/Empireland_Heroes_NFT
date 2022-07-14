const { ethers } = require("hardhat");

async function main() {
    const [admin] = await ethers.getSigners();
  
    console.log("Admin account:", admin.address);
    console.log("Account balance:", (await admin.getBalance()).toString());

    //  Deploy Box contract
    console.log('Deploy Box Contract .........');
    const Gov = '';
    const baseURI = 'https://empire-land.io/nft/box/';

    const EPLBox = await ethers.getContractFactory('EPLBox', admin);
    const box = await EPLBox.deploy(Gov, baseURI);
    await box.deployed();

    console.log('Box Contract: ', box.address);
    
    console.log('\n===== DONE =====')
}
  
main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
});