const oasis721BaseCont = artifacts.require('OasisXNFT721')

const { setEnvValue } = require('../utils/env-man')

const conf = require('../migration-parameters.js')

const setOasisXBase721 = (n, v) => {
  setEnvValue(
    '../../oasisx-frontend',
    `NEXT_PUBLIC_OASISXBase721_ADDRESS_${n.toUpperCase()}`,
    v,
  )
  setEnvValue('../', `OasisXBase721_ADDRESS_${n.toUpperCase()}`, v)
}

module.exports = async (deployer, network, accounts) => {
  switch (network) {
    case 'rinkeby':
      c = { ...conf.rinkeby }
      break
    case 'mainnet':
      c = { ...conf.mainnet }
      break
    case 'mumbai':
      c = { ...conf.mumbai }
      break
    case 'goerli':
      c = { ...conf.goerli }
      break
    case 'base-goerli':
      c = { ...conf.basegoerli }
      break
    case 'sepolia':
      c = { ...conf.sepolia }
      break
    case 'development':
    default:
      c = { ...conf.devnet }
  }

  // Deploy 721 Base contract
  await deployer.deploy(
    oasis721BaseCont,
    c.oasis721.token1.name,
    c.oasis721.token1.symbol,
  )

  // checking if successful
  const oasis721Base = await oasis721BaseCont.deployed()

  if (oasis721Base) {
    console.log(
      `Deployed: OasisX 721Base 
       network: ${network} 
       address: ${oasis721Base.address} 
       creator: ${accounts[0]} 
    `,
    )
    setOasisXBase721(network, oasis721Base.address)
  } else {
    console.log('OasisX 721Base Deployment UNSUCCESSFUL')
  }
}
