const { ethers } = require("hardhat");
const abi = require('../build/artifacts/contracts/EPLManagement.sol/EPLManagement.json').abi;

async function main() {
    const [admin] = await ethers.getSigners();

    console.log("Admin account:", admin.address);
    console.log("Account balance:", (await admin.getBalance()).toString());

    const provider = ethers.getDefaultProvider(process.env.FANTOM_TESTNET_PROVIDER);
    const Gov = '';
    const gov = new ethers.Contract(Gov, abi, provider);

    console.log('Register EPLHeroes contract');
    const EPLHeroes = '';
    let tx = await gov.connect(admin).addToList(EPLHeroes);
    await tx.wait();

    console.log('Grant Minter Role');
    let roleMinter = await gov.MINTER_ROLE();
    tx = await gov.connect(admin).grantRole(roleMinter, admin.address);
    await tx.wait();

    const SaleEvents = '';
    tx = await gov.connect(admin).grantRole(roleMinter, SaleEvents);
    await tx.wait();

    console.log('\n===== DONE =====')
}
  
main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
});