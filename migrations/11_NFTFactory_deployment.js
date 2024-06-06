const oasisFactoryCont = artifacts.require('OasisXLaunchFactory')
const oasis721BaseCont = artifacts.require('OasisXNFT721')
const oasis1155BaseCont = artifacts.require('OasisXNFT1155')
const oasisX1155Cont = artifacts.require('OasisX1155')

const { setEnvValue } = require('../utils/env-man')

const conf = require('../migration-parameters.js')

const setNFTFactory = (n, v) => {
  setEnvValue(
    '../../oasisx-frontend',
    `NEXT_PUBLIC_OASISXNFTFactory_ADDRESS_${n.toUpperCase()}`,
    v,
  )
  setEnvValue('../', `OasisXNFTFactory_ADDRESS_${n.toUpperCase()}`, v)
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

  // get base contract address
  const base721_address = (await oasis721BaseCont.deployed()).address
  const base1155_address = (await oasis1155BaseCont.deployed()).address
  const oasisx1155_address = (await oasisX1155Cont.deployed()).address

  // deploy Factory contract
  await deployer.deploy(
    oasisFactoryCont,
    base721_address,
    base1155_address,
    c.launchpad.protocolFee,
    accounts[0],
    oasisx1155_address,
  )

  // checking if successful
  const oasisfactory = await oasisFactoryCont.deployed()

  if (oasisfactory) {
    console.log(
      `Deployed: OasisX NFTFactory
           network: ${network} 
           address: ${oasisfactory.address} 
           creator: ${accounts[0]} 
        `,
    )
    setNFTFactory(network, oasisfactory.address)
  } else {
    console.log('OasisX NFTFactory Deployment UNSUCCESSFUL')
  }
}
