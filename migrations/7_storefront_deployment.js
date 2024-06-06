const OasisXStoreFrontCont = artifacts.require('OasisXStorefront')
const OasisXRegistryCont = artifacts.require('OasisXRegistry')

const { setEnvValue } = require('../utils/env-man')

const conf = require('../migration-parameters')

const setOasisXStoreFront = (n, v) => {
  setEnvValue(
    '../../oasisx-frontend',
    `NEXT_PUBLIC_OASISXStorefront_ADDRESS_${n.toUpperCase()}`,
    v,
  )
  setEnvValue('../', `OasisXStorefront_ADDRESS_${n.toUpperCase()}`, v)
}

module.exports = async (deployer, network, accounts) => {
  const registry = await OasisXRegistryCont.deployed()

  switch (network) {
    case 'rinkeby':
      c = { ...conf.rinkeby }
      c.storefront.registry = registry.address
      break
    case 'mainnet':
      c = { ...conf.mainnet }
      c.storefront.registry = registry.address
      break
    case 'mumbai':
      c = { ...conf.mumbai }
      c.storefront.registry = registry.address
      break
    case 'goerli':
      c = { ...conf.goerli }
      break
    case 'sepolia':
      c = { ...conf.sepolia }
      break
    case 'base-goerli':
      c = { ...conf.basegoerli }
      break
    case 'development':
    default:
      c = { ...conf.devnet }
      c.storefront.registry = registry.address
  }

  if ('development') {
    c.storefront.registry = registry.address
  }

  // Deploy OasisX Storefront
  await deployer.deploy(
    OasisXStoreFrontCont,
    c.storefront.name,
    c.storefront.symbol,
    c.storefront.registry,
    c.storefront.templateURI,
    c.storefront.migrationAddress,
  )
  const OasisXStoreFront = await OasisXStoreFrontCont.deployed()

  if (OasisXStoreFront) {
    console.log(
      `Deployed: OasisX Storefront
       network: ${network}
       address: ${OasisXStoreFront.address}
       creator: ${accounts[0]}
    `,
    )
    setOasisXStoreFront(network, OasisXStoreFront.address)
  } else {
    console.log('OasisX StoreFront Deployment UNSUCCESSFUL')
  }
}
