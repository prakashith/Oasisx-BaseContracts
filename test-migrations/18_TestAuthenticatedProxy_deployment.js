const TestAuthenticatedProxyCont = artifacts.require("TestAuthenticatedProxy");

const { setEnvValue } = require("../utils/env-man");

const setTestAuthenticatedProxy = (n, v) =>
  setEnvValue("../", `TestAuthenticatedProxy_ADDRESS_${n.toUpperCase()}`, v);

module.exports = async (deployer, network, accounts) => {
  // Deploy TestSmartContractWallet
  await deployer.deploy(TestAuthenticatedProxyCont);
  const TestAuthenticatedProxy = await TestAuthenticatedProxyCont.deployed();

  if (TestAuthenticatedProxy) {
    console.log(
      `Deployed: TestAuthenticatedProxy 
       network: ${network} 
       address: ${TestAuthenticatedProxy.address} 
       creator: ${accounts[0]} 
    `
    );
    setTestAuthenticatedProxy(network, TestAuthenticatedProxy.address);
  } else {
    console.log("TestAuthenticatedProxy Deployment UNSUCCESSFUL");
  }
};
