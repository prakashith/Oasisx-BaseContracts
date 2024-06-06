const HDWalletProvider = require("@truffle/hdwallet-provider");
const fs = require("fs");

const key_BASE = fs.readFileSync(".base.secret").toString().trim();

module.exports = {
	contracts_build_directory: "../oasisx-frontend/abis",
	contracts_build_directory: "./abis",
	networks: {
		development: {
			host: "127.0.0.1",
			port: 8545,
			gas: 6700000,
			gasPrice: 80000000000, // 80
			network_id: "*",
		},
		base: {
			provider: () =>
				new HDWalletProvider(key_BASE, "https://mainnet.base.org"),
			network_id: 8453,
			gas: 6000000, // to be modified
			gasPrice: 10000000000, // to be modified
			confirmations: 10,
			timeoutBlocks: 200,
			skipDryRun: true,
			verify: {
				apiUrl: "https://api.basescan.org/api",
				apiKey: "XXXXXX",
				explorerUrl: "https://basescan.org/address",
			},
		},

		base_sepolia: {
			provider: () =>
				new HDWalletProvider(
					key_BASE,
					"https://sepolia.base.org/address"
				),
			network_id: 84532,
			gas: 6000000, // to be modified
			gasPrice: 10000000000, // to be modified
			confirmations: 10,
			timeoutBlocks: 200,
			skipDryRun: true,
			verify: {
				apiUrl: "https://api-sepolia.basescan.org/api",
				apiKey: "XXXXXX",
				explorerUrl: "https://sepolia.basescan.org/address",
			},
		},
	},
	mocha: {},
	plugins: ["truffle-plugin-verify"],
	api_keys: {
		etherscan: "XXXXXX",
		polygonscan: "XXXXXX",
		bscscan: "XXXXXX",
		basescan: "XXXXXX",
	},
	compilers: {
		solc: {
			version: "0.8.17",
			settings: {
				optimizer: {
					enabled: true,
					runs: 200,
				},
			},
		},
	},
	db: {
		enabled: false,
	},
};
