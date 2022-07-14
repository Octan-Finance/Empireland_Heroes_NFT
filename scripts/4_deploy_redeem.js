const { ethers } = require("hardhat");

async function main() {
    const [admin] = await ethers.getSigners();
  
    console.log("Admin account:", admin.address);
    console.log("Account balance:", (await admin.getBalance()).toString());

    //  Deploy Redemption contract
    const Gov = '';
    console.log('Deploy Redemption Contract .........');
    const Redemption = await ethers.getContractFactory('Redemption', admin);
    const redemption = await Redemption.deploy(Gov);

    console.log('Redemption Contract: ', redemption.address);

    console.log('\n===== DONE =====')
}
  
main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
});