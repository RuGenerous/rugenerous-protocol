const prompt = require('async-prompt');

async function main() {

    const rug = await prompt('Enter rug token address: ');
    const srug = await prompt('Enter srug token address: ');
    const MultiDelegator = await ethers.getContractFactory("MultiDelegator");
    const multiDelegator = await MultiDelegator.deploy(rug, srug);
    await multiDelegator.deployed();
    console.log("MultiDelegator deployed to:", multiDelegator.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });