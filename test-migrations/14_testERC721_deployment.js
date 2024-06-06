const TestERC721Cont = artifacts.require("TestERC721");

const { setEnvValue } = require("../utils/env-man");

const setTestERC721Env = (n, v) =>
  setEnvValue("../", `TestERC721_ADDRESS_${n.toUpperCase()}`, v);

module.exports = async (deployer, network, accounts) => {
  // Deploy TestERC721
  await deployer.deploy(TestERC721Cont);
  const TestERC721 = await TestERC721Cont.deployed();

  if (TestERC721) {
    console.log(
      `Deployed: TestERC721 
       network: ${network} 
       address: ${TestERC721.address} 
       creator: ${accounts[0]} 
    `
    );
    setTestERC721Env(network, TestERC721.address);
  } else {
    console.log("TestERC721 Deployment UNSUCCESSFUL");
  }
};
