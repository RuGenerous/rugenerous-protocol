const { ethers } = require('hardhat')

async function main () {
  // same address for all networks
  const EXCHANGE_ROUTER = ''

  const Harvester = await ethers.getContractFactory('ExchangeHarvester')
  const harvester = await Harvester.deploy(EXCHANGE_ROUTER)
  await harvester.deployed()
  console.log('harvester deployed to:', harvester.address)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
