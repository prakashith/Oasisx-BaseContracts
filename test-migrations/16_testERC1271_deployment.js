const TestERC1271Cont = artifacts.require("TestERC1271");

const { setEnvValue } = require("../utils/env-man");

const setTestERC1271Env = (n, v) => setEnvValue("../", `TestERC1271_ADDRESS_${n.toUpperCase()}`, v);

module.exports = async (deployer, network, accounts) => {
  // Deploy TestERC1271
  await deployer.deploy(TestERC1271Cont);
  const TestERC1271 = await TestERC1271Cont.deployed();

  if (TestERC1271) {
    console.log(
      `Deployed: TestERC1271 
       network: ${network} 
       address: ${TestERC1271.address} 
       creator: ${accounts[0]} 
    `);
    setTestERC1271Env(network, TestERC1271.address);
  } else {
    console.log("TestERC1271 Deployment UNSUCCESSFUL");
  }
};
