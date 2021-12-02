const hre = require('hardhat')
const { describe, it } = require('mocha')
const { ethers } = require('hardhat')
const { expect } = require('chai')

const RUG_DEPLOYER = ''
const FTOKEN = ''
const DAI = ''

const HARVESTER = ''
const BIFI_ADDRESS = ''
const DAI_BAGS = ''

const RUGDAO_TIMELOCK = ''
const FARMPOOL = ''
const EXCHANGE_ROUTER = ''

const HARVEST_DEPLOYER = ''
const NOTIFY_HELPER = ''
const DELAY_MINTER = ''

const overrides = {
  gasPrice: ethers.utils.parseUnits('0', 'gwei')
}

describe('vault strategy experiments', function () {
  let strat, vault, dai, weth

  it('Deploys DAI -> BIFI Vault', async function () {
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [RUG_DEPLOYER]
    })
    const signer = await ethers.provider.getSigner(RUG_DEPLOYER)
    let Vault = await ethers.getContractFactory('Vault')
    Vault = Vault.connect(signer)
    vault = await Vault.deploy(DAI, BIFI_ADDRESS, HARVESTER, RUGDAO_TIMELOCK, 'HARVESTFI: DAI to BIFI Vault', 'testDAI>BIFI')

    await vault.deployed()
  })

  it('Deploys fToken strat', async function () {
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [RUG_DEPLOYER]
    })

    const signer = await ethers.provider.getSigner(RUG_DEPLOYER)
    let Strat = await ethers.getContractFactory('FTokenStrat')
    Strat = Strat.connect(signer)
    strat = await Strat.deploy(vault.address, FTOKEN, FARMPOOL, EXCHANGE_ROUTER, overrides)

    await strat.deployed()
  })

  it('Connects strat to Vault', async function () {
    await vault.setStrat(strat.address, false)
    expect(await vault.strat()).to.equal(strat.address)
    expect(await vault.paused()).to.equal(false)
  })

  it('Sets strategist', async function () {
    strat.setStrategist(RUG_DEPLOYER)
    expect(await strat.strategist()).to.equal(RUG_DEPLOYER)
  })

  it('Sets buffer', async function () {
    await strat.setBuffer(ethers.utils.parseEther('1000'))
    expect(await strat.buffer()).to.equal(ethers.utils.parseEther('1000'))
  })

  it('Reverts unauthorized call to changeTimelock', async function () {
    await expect(
      strat.changeTimelock(RUGDAO_TIMELOCK)
    ).to.be.revertedWith("CAN ONLY BE CALLED BY TIMELOCK");
  })

  it('Only updates timelock from timelock', async function () {
    const signer = await ethers.provider.getSigner(RUG_DEPLOYER)
    const timelockAddress = await strat.timelock()
    const timelock = await ethers.getContractAt('contracts/misc/Timelock.sol:Timelock', timelockAddress)
    admin = timelock.connect(signer)

    const currentBlock = await ethers.provider.getBlockNumber()
    const block = await ethers.provider.getBlock(currentBlock)
    const timestamp = block.timestamp + 178800
    const payload = ethers.utils.hexZeroPad(RUGDAO_TIMELOCK, 32)
    const stratAddress = await vault.strat()
    await admin.queueTransaction(stratAddress, 0, "changeTimelock(address)", payload, timestamp)
    const future = timestamp + 1000
    await hre.network.provider.request({
      method: 'evm_setNextBlockTimestamp',
      params: [future]
    })
    await admin.executeTransaction(stratAddress, 0, "changeTimelock(address)", payload, timestamp)
    expect(await strat.timelock()).to.equal(RUGDAO_TIMELOCK)
  })

  it('[Setup harvest deployer and notify reward pools]', async function () {
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [HARVEST_DEPLOYER]
    })
    const signer = await ethers.provider.getSigner(HARVEST_DEPLOYER)
    const minter = await ethers.getContractAt('IDelayMinter', DELAY_MINTER)
    mint = minter.connect(signer)
    await mint.announceMint(HARVEST_DEPLOYER, ethers.utils.parseEther('12462'))

    const currentBlock = await ethers.provider.getBlockNumber()
    const block = await ethers.provider.getBlock(currentBlock)
    const timestamp = block.timestamp + 178800

    await hre.network.provider.request({
      method: 'evm_setNextBlockTimestamp',
      params: [timestamp]
    })
    const farm = (await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', await strat.rewardtoken())).connect(signer)
    await farm.approve(DELAY_MINTER, ethers.utils.parseEther('10000'))
    await farm.approve(NOTIFY_HELPER, ethers.utils.parseEther('10000'))

    await mint.executeMint(17)

    const notify = await ethers.getContractAt('INotifyHelper', NOTIFY_HELPER)
    gov = notify.connect(signer)
    await gov.notifyPoolsIncludingProfitShare([ethers.utils.parseEther('6000')],[FARMPOOL], ethers.utils.parseEther('1425'), 1608663600, ethers.utils.parseEther('7425'))
  })

  it('Deposits (DAI)', async function () {
    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [DAI_BAGS]
    })
    const signer = await ethers.provider.getSigner(DAI_BAGS)
    vault = vault.connect(signer)
    const supply = await vault.totalSupply()
    const totalVal = await strat.calcTotalValue()
    const dai = (await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', DAI)).connect(signer)
    await dai.approve(vault.address, ethers.utils.parseEther('11000000'))
    const vaultBalanceBefore = await vault.balanceOf(DAI_BAGS)
    await vault.deposit(ethers.utils.parseEther('20000'))
    const vaultBalanceAfter = await vault.balanceOf(DAI_BAGS)
    expect(vaultBalanceAfter - ethers.utils.parseEther('20000')).to.equal(vaultBalanceBefore)
  })

  it('[FFW]', async function () {
    const currentBlock = await ethers.provider.getBlockNumber()
    const block = await ethers.provider.getBlock(currentBlock)
    const timestamp = block.timestamp + 1178800

    await hre.network.provider.request({
      method: 'evm_setNextBlockTimestamp',
      params: [timestamp]
    })
  })

  it('Withdraws (DAI)', async function () {
    const currentBlock = await ethers.provider.getBlockNumber()
    const block = await ethers.provider.getBlock(currentBlock)
    const timestamp = block.timestamp + 178800
    await hre.network.provider.request({
      method: 'evm_setNextBlockTimestamp',
      params: [timestamp]
    })

    await hre.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [DAI_BAGS]
    })
    const signer = await ethers.provider.getSigner(DAI_BAGS)
    strat = strat.connect(signer)
    vault = vault.connect(signer)
    dai = (await ethers.getContractAt('IERC20Detailed', DAI)).connect(signer)

    const oldBalance = await dai.balanceOf(DAI_BAGS)
    const rewardTokenAddress = await strat.rewardtoken()
    const farm = (await ethers.getContractAt('@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20', rewardTokenAddress)).connect(signer)
    await farm.approve(strat.address, ethers.utils.parseEther('10000'))
    expect(await farm.balanceOf(strat.address)).to.equal(0)

    const balance = await vault.balanceOf(DAI_BAGS)
    const buffer = await strat.buffer()
    const delta = balance.sub(buffer)

    await vault.withdraw(delta)
    const newBalance = await dai.balanceOf(DAI_BAGS)
    expect(newBalance.sub(oldBalance)).to.equal(ethers.utils.parseEther('19000'))  // -1000 for the buffer
  })

  it('Harvests FARM tokens from strat', async function () {
    const signer = await ethers.provider.getSigner(RUG_DEPLOYER)
    strat = strat.connect(signer)

    const outmin = 1
    path = [ await strat.rewardtoken(), DAI]
    const currentBlock = await ethers.provider.getBlockNumber()
    const block = await ethers.provider.getBlock(currentBlock)
    const deadline = block.timestamp + 1000

    const oldBalance = await dai.balanceOf(strat.address)
    const harvested = await strat.harvestRewardToken(outmin, path, deadline, overrides)
    const newBalance = await dai.balanceOf(strat.address)
    const balanceDelta = newBalance - oldBalance
    expect(balanceDelta).to.gt(0)

    const balanceDeltaDec = balanceDelta / 10 ** (await dai.decimals())
    console.log("ADDED DAI FROM FARM HARVEST", balanceDeltaDec)
  })

})
