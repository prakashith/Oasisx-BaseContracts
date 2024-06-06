const oasis1155BaseCont = artifacts.require('OasisXNFT1155')

const { setEnvValue } = require('../utils/env-man')

const conf = require('../migration-parameters.js')

const setOasisXBase1155 = (n, v) => {
  setEnvValue(
    '../../oasisx-frontend',
    `NEXT_PUBLIC_OASISXBase1155_ADDRESS_${n.toUpperCase()}`,
    v,
  )
  setEnvValue('../', `OasisXBase1155_ADDRESS_${n.toUpperCase()}`, v)
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

  // deploy 1155 Base contract
  await deployer.deploy(
    oasis1155BaseCont,
    c.oasis1155.token1.name,
    c.oasis1155.token1.symbol,
    c.oasis1155.token1.uri,
  )

  // checking if successful
  const oasis1155Base = await oasis1155BaseCont.deployed()

  if (oasis1155Base) {
    console.log(
      `Deployed: OasisX 1155Base 
           network: ${network} 
           address: ${oasis1155Base.address} 
           creator: ${accounts[0]} 
        `,
    )
    setOasisXBase1155(network, oasis1155Base.address)
  } else {
    console.log('OasisX 1155Base Deployment UNSUCCESSFUL')
  }
}
