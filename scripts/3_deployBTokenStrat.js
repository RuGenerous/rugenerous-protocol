const { ethers } = require('hardhat')
const prompt = require('async-prompt')

async function main () {
  const vault = await prompt('Enter vault address: ')
  const cToken = await prompt('Enter cToken token address: ')

  const Strat = await ethers.getContractFactory('BTokenStrat')
  const strat = await Strat.deploy(
    vault,
    cToken
  )
  await strat.deployed()

  console.log('BTokenStrat deployed to:', strat.address)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
