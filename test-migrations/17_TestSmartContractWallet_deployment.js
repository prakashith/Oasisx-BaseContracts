const TestSmartContractWalletCont = artifacts.require("TestSmartContractWallet");

const { setEnvValue } = require("../utils/env-man");

const setTestSmartContractWalletEnv = (n, v) => setEnvValue("../", `TestSmartContractWallet_ADDRESS_${n.toUpperCase()}`, v);

module.exports = async (deployer, network, accounts) => {
  // Deploy TestSmartContractWallet
  await deployer.deploy(TestSmartContractWalletCont);
  const TestSmartContractWallet = await TestSmartContractWalletCont.deployed();

  if (TestSmartContractWallet) {
    console.log(
      `Deployed: TestSmartContractWallet 
       network: ${network} 
       address: ${TestSmartContractWallet.address} 
       creator: ${accounts[0]} 
    `);
    setTestSmartContractWalletEnv(network, TestSmartContractWallet.address);
  } else {
    console.log("TestSmartContractWallet Deployment UNSUCCESSFUL");
  }
};
