const TestERC20Cont = artifacts.require("TestERC20");

const { setEnvValue } = require("../utils/env-man");

const setTestERC20Env = (n, v) => setEnvValue("../", `TestERC20_ADDRESS_${n.toUpperCase()}`, v);

module.exports = async (deployer, network, accounts) => {
  // Deploy TestERC20
  await deployer.deploy(TestERC20Cont);
  const testerc20 = await TestERC20Cont.deployed();

  if (testerc20) {
    console.log(
      `Deployed: TestERC20 
       network: ${network} 
       address: ${testerc20.address} 
       creator: ${accounts[0]} 
    `);
    setTestERC20Env(network, testerc20.address);
  } else {
    console.log("TestERC20 Deployment UNSUCCESSFUL");
  }
};
