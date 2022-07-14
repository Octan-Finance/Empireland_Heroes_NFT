const { ethers } = require("hardhat");

async function main() {
    const [admin] = await ethers.getSigners();
  
    console.log("Admin account:", admin.address);
    console.log("Account balance:", (await admin.getBalance()).toString());

    //  Deploy SaleEvents contract
    const Gov = '';
    console.log('Deploy SaleEvents Contract .........');
    const SaleEvents = await ethers.getContractFactory('SaleEvents', admin);
    const sale = await SaleEvents.deploy(Gov);
    await sale.deployed();

    console.log('SaleEvents Contract: ', sale.address);
    
    console.log('\n===== DONE =====')
}
  
main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
});