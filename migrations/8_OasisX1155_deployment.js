const oasisx1155Cont = artifacts.require('OasisX1155')

const { setEnvValue } = require('../utils/env-man')

const conf = require('../migration-parameters.js')

const setOasisX1155 = (n, v) => {
  setEnvValue(
    '../../oasisx-frontend',
    `NEXT_PUBLIC_OASISX1155_ADDRESS_${n.toUpperCase()}`,
    v,
  )
  setEnvValue('../', `OasisX1155_ADDRESS_${n.toUpperCase()}`, v)
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

  // Deploy 1155 contract
  await deployer.deploy(
    oasisx1155Cont,
    c.oasisnft.name,
    c.oasisnft.symbol,
    c.oasisnft.uri,
    c.oasisnft.tokenIds,
    c.oasisnft.mintCostPerTokenId,
    c.oasisnft.mbenefeciary,
  )

  // checking if successful
  const oasisx1155 = await oasisx1155Cont.deployed()

  if (oasisx1155) {
    console.log(
      `Deployed: OasisX1155
       network: ${network} 
       address: ${oasisx1155.address} 
       creator: ${accounts[0]} 
    `,
    )
    setOasisX1155(network, oasisx1155.address)
  } else {
    console.log('OasisX1155 Deployment UNSUCCESSFUL')
  }
}
