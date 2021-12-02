const { ethers } = require('hardhat')
const prompt = require('async-prompt')

async function main () {
  // same address for all networks
  const EXCHANGE_ROUTER = ''
  const pair = await prompt('Enter Pair address: ')
  const Harvester = await ethers.getContractFactory('LpExchangeHarvester')
  const harvester = await Harvester.deploy(EXCHANGE_ROUTER, pair)
  await harvester.deployed()
  console.log('harvester deployed to:', harvester.address)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
