const OasisXAtomicizerCont = artifacts.require("OasisXAtomicizer");

const { setEnvValue } = require("../utils/env-man");

const setAtomicizerEnv = (n, v) => {
  setEnvValue(
    "../../oasisx-frontend",
    `NEXT_PUBLIC_OASISXATOMICIZER_ADDRESS_${n.toUpperCase()}`,
    v
  );
  setEnvValue("../", `OASISXATOMICIZER_ADDRESS_${n.toUpperCase()}`, v);
};

module.exports = async (deployer, network, accounts) => {
  // deploy OasisX Atomicizer
  await deployer.deploy(OasisXAtomicizerCont);

  const atomicizer = await OasisXAtomicizerCont.deployed();

  if (atomicizer) {
    console.log(
      `Deployed: OasisX Atomicizer
       network: ${network}
       address: ${atomicizer.address}
       owner: ${accounts[0]}
    `
    );
    setAtomicizerEnv(network, atomicizer.address);
  } else {
    console.log("OasisX Atomicizer Deployment UNSUCCESSFUL");
  }
};
