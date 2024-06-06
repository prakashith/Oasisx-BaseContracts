const OasisXExchangeCont = artifacts.require("OasisXExchange");
const OasisXRegistryCont = artifacts.require("OasisXRegistry");

const conf = require("../migration-parameters.js");

const { setEnvValue } = require("../utils/env-man");
const { getProtocolFeeStruct } = require("../utils/util");

const setExchangeEnv = (n, v) => {
	setEnvValue(
		"../../oasisx-frontend",
		`NEXT_PUBLIC_OASISXEXCHANGE_ADDRESS_${n.toUpperCase()}`,
		v
	);
	setEnvValue("../", `OASISXEXCHANGE_ADDRESS_${n.toUpperCase()}`, v);
};

module.exports = async (deployer, network, accounts) => {
	// Getting the deployed registry contract
	const registry = await OasisXRegistryCont.deployed();

	const protocolFeeRecipient = accounts[0];

	switch (network) {
		case "rinkeby":
			c = { ...conf.rinkeby };
			break;
		case "mainnet":
			c = { ...conf.mainnet };
			break;
		case "goerli":
			c = { ...conf.goerli };
			break;
		case "base-goerli":
			c = { ...conf.basegoerli };
			break;
		case "sepolia":
			c = { ...conf.sepolia };
			break;
		case "base":
			c = { ...conf.base };
		case "development":
		default:
			c = { ...conf.devnet };
	}

	const { maxRange, minRange, slope, constant } = getProtocolFeeStruct(
		c.protocolFees.maxFee,
		c.protocolFees.minFee,
		c.protocolFees.maxRange,
		c.protocolFees.minRange
	);

	// Deploying OasisX Exchange
	await deployer.deploy(
		OasisXExchangeCont,
		[registry.address],
		protocolFeeRecipient,
		[
			maxRange,
			minRange,
			c.protocolFees.minFee,
			c.protocolFees.maxFee,
			slope.toString(),
			constant.toString(),
			false,
		]
	);

	// Getting the deployed exchange contract
	const exchange = await OasisXExchangeCont.deployed();

	if (exchange) {
		console.log(
			`Deployed: OasisX Exchange
       network: ${network}
       address: ${exchange.address}
       owner: ${accounts[0]}
    `
		);
		setExchangeEnv(network, exchange.address);
	} else {
		console.log("OasisX Exchange Deployment UNSUCCESSFUL");
	}
};
