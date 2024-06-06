const OasisXExchangeCont = artifacts.require('OasisXExchange')

const { loadNetworkConfig } = require('../utils/test-utils')(web3)
const { getProtocolFeeStruct } = require('../utils/util')
const conf = require('../migration-parameters.js')

module.exports = async (callback) => {
  try {
    const network = config.network
    const exchange = await OasisXExchangeCont.deployed()
    console.log(network)

    let c = loadNetworkConfig(conf)['sepolia']()
    let gasUsedTotal = 0

    const { maxRange, minRange, slope, constant } = getProtocolFeeStruct(
      c.protocolFees.maxFee,
      c.protocolFees.minFee,
      c.protocolFees.maxRange,
      c.protocolFees.minRange,
    )
      console.log(maxRange, minRange, c.protocolFees.minFee, c.protocolFees.maxFee, slope.toString(), constant.toString())
    console.log(`Change protocolFee struct : ${exchange.address}`)
    try {
      const tx1 = await exchange.changeProtocolFee([
        maxRange,
        minRange,
        c.protocolFees.minFee,
        c.protocolFees.maxFee,
        slope.toString(),
        constant.toString(),
        false,
      ])
      gasUsedTotal += tx1.receipt.cumulativeGasUsed;
    } catch (error) {
      console.log(1111)
      console.log(error)
    }
    console.log('-------------------------------\n')

    console.log('ProtocolFee update cost: ', (gasUsedTotal * 50) / 1000000000)

    callback()
  } catch (e) {
    callback(e)
  }
}
