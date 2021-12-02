// mainnet forking integration test
const hre = require('hardhat')
const { ethers } = require('hardhat')
const { describe, it } = require('mocha')
const { expect } = require('chai')

const EXCHANGE_ROUTER_ADDRESS = ''
const DAI_ADDRESS = ''
const WETH_ADDRESS = ''
const CDAI_ADDRESS = ''
//const IMPERSONATED_ADDRESS = ''
const IMPERSONATED_ADDRESS = ''
const RUGDAO_TIMELOCK = ''

describe('test in prod', function () {
  let harvester, vault, strat, dai, weth

  it('Should deploy harvester', async function () {
    const Harvester = await ethers.getContractFactory('ExchangeHarvester')
    harvester = await Harvester.deploy(EXCHANGE_ROUTER_ADDRESS)

    await harvester.deployed()
    expect(await harvester.router()).to.equal(EXCHANGE_ROUTER_ADDRESS)
  })

  it('Should deploy DAI -> WETH Vault', async function () {
    const Vault = await ethers.getContractFactory('EthVault')
    vault = await Vault.deploy(DAI_ADDRESS, WETH_ADDRESS, harvester.address, RUGDAO_TIMELOCK, 'Test DAI to ETH Vault', 'testDAI>ETH')

    await vault.deployed()
  })

  it('Should deploy cDai Strat', async function () {
    const Strat = await ethers.getContractFactory('BTokenStrat')
    strat = await Strat.deploy(vault.address, CDAI_ADDRESS)

    await strat.deployed()
  })

  it('Should connect Strat to Vault', async function () {
    await vault.setStrat(strat.address, false)
    expect(await vault.strat()).to.equal(strat.address)
    expect(await vault.paused()).to.equal(false)
  })

  it('Should deposit (DAI)', async function () {
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [IMPERSONATED_ADDRESS]
    }
    )
    const signer = await ethers.provider.getSigner(IMPERSONATED_ADDRESS)
    vault = vault.connect(signer)
    dai = (await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', DAI_ADDRESS)).connect(signer)
    await dai.approve(vault.address, ethers.utils.parseEther('1000'))
    await vault.deposit(ethers.utils.parseEther('1000'))
    expect(await vault.balanceOf(await signer.getAddress())).to.equal(ethers.utils.parseUnits('1000'))
  })

  it('Should harvest', async function () {
    const currentBlock = await ethers.provider.getBlockNumber()
    const block = await ethers.provider.getBlock(currentBlock)
    const future = block.timestamp + 178800

    await hre.network.provider.request({
      method: 'evm_setNextBlockTimestamp',
      params: [future]
    }
    )
    await vault.underlyingYield() // we send a tx to compound for it to accrue interest
    const uyield = await vault.callStatic.underlyingYield()
    await harvester.harvestVault(
      vault.address,
      uyield,
      0,
      [DAI_ADDRESS, WETH_ADDRESS],
      future + 10)
    weth = (await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', WETH_ADDRESS))
    expect(await weth.balanceOf(vault.address)).to.gt(0)
  })

  it('Should claim target token (ETH)', async function () {
    const unclaimedProfits = await vault.unclaimedProfit(IMPERSONATED_ADDRESS)
    expect(unclaimedProfits).to.gt(0)
    const balanceBefore = await ethers.provider.getBalance(IMPERSONATED_ADDRESS)
    const tx = await vault.claimETH({ gasPrice: '1' })
    const receipt = await tx.wait()
    const balanceAfter = await ethers.provider.getBalance(IMPERSONATED_ADDRESS)
    expect(balanceAfter.sub(balanceBefore.sub(receipt.cumulativeGasUsed))).to.equal(unclaimedProfits)
  })

  it('Should withdraw principal (ETH)', async function () {
    const daiBeforeBalance = await dai.balanceOf(IMPERSONATED_ADDRESS)
    await vault.withdraw(ethers.utils.parseEther('1000'))
    const daiAfterBalance = await dai.balanceOf(IMPERSONATED_ADDRESS)
    expect(daiAfterBalance.sub(daiBeforeBalance)).to.equal(ethers.utils.parseEther('1000'))
    expect(await vault.balanceOf(IMPERSONATED_ADDRESS)).to.equal(0)
  })
})
