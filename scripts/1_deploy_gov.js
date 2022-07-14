const { ethers } = require("hardhat");
const config = require('../config/config.js');

async function main() {
    const [admin] = await ethers.getSigners();
  
    console.log("Admin account:", admin.address);
    console.log("Account balance:", (await admin.getBalance()).toString());

    //  Deploy EPLManagement contract
    console.log('Deploy EPLManagement Contract .........');
    const GOV = await ethers.getContractFactory('EPLManagement', admin);
    const gov = await GOV.deploy(config.treasury);
    await gov.deployed();

    console.log('EPLManagement Contract: ', gov.address);

    //  Set MANAGER_ROLE
    console.log('Set Manager role to Deployer');
    let roleManager = await gov.MANAGER_ROLE();
    await gov.connect(admin).grantRole(roleManager, admin.address);

    console.log('\n===== DONE =====')
}
  
main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
});