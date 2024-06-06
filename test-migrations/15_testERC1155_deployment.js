const TestERC1155Cont = artifacts.require("TestERC1155");

const { setEnvValue } = require("../utils/env-man");

const setTestERC1155Env = (n, v) => setEnvValue("../", `TestERC1155_ADDRESS_${n.toUpperCase()}`, v);

module.exports = async (deployer, network, accounts) => {
  // Deploy TestERC1155
  await deployer.deploy(TestERC1155Cont);
  const TestERC1155 = await TestERC1155Cont.deployed();

  if (TestERC1155) {
    console.log(
      `Deployed: TestERC1155 
       network: ${network} 
       address: ${TestERC1155.address} 
       creator: ${accounts[0]} 
    `);
    setTestERC1155Env(network, TestERC1155.address);
  } else {
    console.log("TestERC1155 Deployment UNSUCCESSFUL");
  }
};
