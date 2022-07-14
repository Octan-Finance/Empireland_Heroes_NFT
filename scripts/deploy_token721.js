const { ethers } = require("hardhat");

async function main() {
    const [admin] = await ethers.getSigners();
  
    console.log("Admin account:", admin.address);
    console.log("Account balance:", (await admin.getBalance()).toString());

    //  Deploy Token721 contract
    console.log('Deploy Token721 Contract .........');
    const Token721 = await ethers.getContractFactory('Token721', admin);
    const token721 = await Token721.deploy();

    console.log('Token721 Contract: ', token721.address);
}
  
main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
});