const OasisXRegistryCont = artifacts.require("OasisXRegistry");
const OasisXExchangeCont = artifacts.require("OasisXExchange");

const { loadNetworkConfig } = require("../utils/test-utils")(web3);
const conf = require("../migration-parameters.js");

module.exports = async (callback) => {
	try {
		// const network = config.network;
		const registry = await OasisXRegistryCont.deployed();
		const exchange = await OasisXExchangeCont.deployed();
		// console.log(network);
		// let c = loadNetworkConfig(conf)[network]();
		let gasUsedTotal = 0;

		console.log(
			`Grant authentication to the initial Exchange protocol contract : ${exchange.address}`
		);
		const tx1 = await registry.grantInitialExchangeAuthentication(
			exchange.address
		);
		gasUsedTotal += tx1.receipt.cumulativeGasUsed;
		console.log("-------------------------------\n");

		console.log(
			"Auth Assigment cost in eth: ",
			(gasUsedTotal * 100) / 100000000
		);

		// change clone access after granting initial auth
		callback();
	} catch (e) {
		callback(e);
	}
};
