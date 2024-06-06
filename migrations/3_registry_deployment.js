const OasisXRegistryCont = artifacts.require("OasisXRegistry");
const AuthProxy = artifacts.require("AuthenticatedProxy");

const { setEnvValue } = require("../utils/env-man");

const setRegistryEnv = (n, v) => {
	setEnvValue(
		"../../oasisx-frontend",
		`NEXT_PUBLIC_OASISXREGISTRY_ADDRESS_${n.toUpperCase()}`,
		v
	);
	setEnvValue(
		"../../oasisx-frontend",
		`NEXT_PUBLIC_OASISXREGISTRY_ADDRESS_${n.toUpperCase()}`,
		v
	);
};

module.exports = async (deployer, network, accounts) => {
	// Deploy OasisX Registry

	const authp = await AuthProxy.deployed();
	await deployer.deploy(OasisXRegistryCont, authp.address);
	const registry = await OasisXRegistryCont.deployed();

	if (registry) {
		console.log(
			`Deployed: OasisX Registry 
       network: ${network} 
       address: ${registry.address} 
       creator: ${accounts[0]} 
    `
		);
		setRegistryEnv(network, registry.address);
	} else {
		console.log("OasisX Registry Deployment UNSUCCESSFUL");
	}
};
