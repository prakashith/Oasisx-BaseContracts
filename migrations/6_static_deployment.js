const OasisXStaticCont = artifacts.require("OasisXStatic");
const OasisXAtomicizerCont = artifacts.require("OasisXAtomicizer");

const fs = require("fs");

const conf = require("../migration-parameters.js");

const { setEnvValue } = require("../utils/env-man");
const { loadNetworkConfig } = require("../utils/test-utils")(web3);

const setOasisXStaticEnv = (n, v) => {
  setEnvValue(
    "../../oasisx-frontend",
    `NEXT_PUBLIC_OASISXSTATIC_ADDRESS_${n.toUpperCase()}`,
    v
  );
  setEnvValue("../", `OASISXSTATIC_ADDRESS_${n.toUpperCase()}`, v);
};

module.exports = async (deployer, network, accounts) => {

  // Getting the deployed atomicizer contract
  const atomicizer = await OasisXAtomicizerCont.deployed();

  // deploy OasisX Static
  await deployer.deploy(OasisXStaticCont, atomicizer.address);

  const static = await OasisXStaticCont.deployed();

  if (static) {
    console.log(
      `Deployed: OasisX static
         network: ${network}
         address: ${static.address}
         owner: ${accounts[0]} \n`
    );
    setOasisXStaticEnv(network, static.address);
  } else {
    console.log("OasisXStatic Deployment UNSUCCESSFUL");
  }
};
