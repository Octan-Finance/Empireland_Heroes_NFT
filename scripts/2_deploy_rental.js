const { ethers } = require("hardhat");

async function main() {
    const [admin] = await ethers.getSigners();
  
    console.log("Admin account:", admin.address);
    console.log("Account balance:", (await admin.getBalance()).toString());

    //  Deploy Rental contract
    const Gov = '';
    console.log('Deploy Rental Contract .........');
    const Rental = await ethers.getContractFactory('Rental', admin);
    const rental = await Rental.deploy(Gov);
    await rental.deployed();

    console.log('Rental Contract: ', rental.address);
    
    console.log('\n===== DONE =====')
}
  
main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
});