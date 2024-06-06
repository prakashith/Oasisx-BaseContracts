const AuthProxy = artifacts.require("AuthenticatedProxy");

module.exports = async (deployer, network, accounts) => {
  // Deploy OasisX Registry
  await deployer.deploy(AuthProxy);
  const authp = await AuthProxy.deployed();

  if (authp) {
    console.log(
      `Deployed: OasisX Auth Proxy 
       network: ${network} 
       address: ${authp.address} 
       creator: ${accounts[0]} 
    `
    );
  } else {
    console.log("OasisX Auth Proxy Deployment UNSUCCESSFUL");
  }
};
