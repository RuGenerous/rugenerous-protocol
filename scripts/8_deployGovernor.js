const prompt = require('async-prompt');

async function main() {

    const rug = await prompt('Enter rug token address: ');
    const Governor = await ethers.getContractFactory("GovernorAlpha");
    const governor = await Governor.deploy(rug);
    await governor.deployed();
    console.log("Governor deployed to:", governor.address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });