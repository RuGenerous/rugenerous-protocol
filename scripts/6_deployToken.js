const { ethers } = require('hardhat')
const prompt = require('async-prompt')

async function main () {
  const minter = await prompt('Enter minter/initial holder address: ')
  const RUG = await ethers.getContractFactory('RUG')
  const rug = await RUG.deploy(minter)
  await rug.deployed()
  console.log('RUG deployed to:', rug.address)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
