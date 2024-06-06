const WethCont = artifacts.require("WETH9");

const { setEnvValue } = require("../utils/env-man");

const setWethEnv = (n, v) => {
  setEnvValue(
    "../../oasisx-frontend",
    `NEXT_PUBLIC_WETH_ADDRESS_${n.toUpperCase()}`,
    v
  );
  setEnvValue(
    "../../oasisx-frontend",
    `NEXT_PUBLIC_WETH_ADDRESS_${n.toUpperCase()}`,
    v
  );
};

module.exports = async (deployer, network, accounts) => {
  // Deploy OasisX WethContract
  await deployer.deploy(WethCont);
  const WethContract = await WethCont.deployed();

  if (WethContract) {
    console.log(
      `Deployed: OasisX Weth Contract for sepolia 
       network: ${network} 
       address: ${WethContract.address} 
       creator: ${accounts[0]} 
    `
    );
    setWethEnv(network, WethCont.address);
  } else {
    console.log("OasisX WethContract for sepolia Deployment UNSUCCESSFUL");
  }
};
