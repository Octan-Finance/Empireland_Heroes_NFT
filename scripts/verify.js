const config = require('../config/config.js')

async function main() {
    console.log("Verify EPLManagement Contract ......")
    const Gov = '';

    await hre.run("verify:verify", {
        address: Gov,
        constructorArguments: [config.treasury],
    });

    console.log("Verify Rental Contract ......")
    const Rental = '';

    await hre.run("verify:verify", {
        address: Rental,
        constructorArguments: [Gov],
    });

    console.log("Verify EPLHeroes Contract ......")
    const EPLHeroes = '';

    await hre.run("verify:verify", {
        address: EPLHeroes,
        constructorArguments: [Gov],
    });

    console.log("Verify Redemption Contract ......")
    const Redemption = '';

    await hre.run("verify:verify", {
        address: Redemption,
        constructorArguments: [Gov],
    });

    console.log('\n===== DONE =====')
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
});