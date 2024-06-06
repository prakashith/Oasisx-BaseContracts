const MultiCallCont = artifacts.require("MultiCall");

const { setEnvValue } = require("../utils/env-man");

const setMultiCallEnv = (n, v) => {
  setEnvValue(
    "../../oasisx-frontend",
    `NEXT_PUBLIC_MULTICALL_ADDRESS_${n.toUpperCase()}`,
    v
  );
  setEnvValue(
    "../../oasisx-frontend",
    `NEXT_PUBLIC_MULTICALL_ADDRESS_${n.toUpperCase()}`,
    v
  );
};

module.exports = async (deployer, network, accounts) => {
  // Deploy OasisX Multicall Contract
  await deployer.deploy(MultiCallCont);
  const MultiCallContract = await MultiCallCont.deployed();

  if (MultiCallContract) {
    console.log(
      `Deployed: OasisX MultiCallContract Contract for sepolia
       network: ${network} 
       address: ${MultiCallContract.address} 
       creator: ${accounts[0]} 
    `
    );
    setMultiCallEnv(network, MultiCallContract.address);
  } else {
    console.log("OasisX MultiCallContract for sepolia Deployment UNSUCCESSFUL");
  }
};
