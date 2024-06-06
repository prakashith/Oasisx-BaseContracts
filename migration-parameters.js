const Web3 = require("web3");
const provider = new Web3.providers.HttpProvider("http://localhost:8545");
var web3 = new Web3(provider);

const { toTokens } = require("./utils/test-utils")(web3);

module.exports = {
	basegoerli: {
		storefront: {
			name: "OasisX Storefront",
			symbol: "OasisXStorefront",
			registry: "",
			templateURI: "",
			migrationAddress: "0x0000000000000000000000000000000000000000",
		},
		oasis721: {
			token1: {
				name: "OasisX721Implementation",
				symbol: "OasisXI",
				baseTokenURI: "ipfs://revealedArtUri/",
				notRevealedUri: "ipfs://notRevealedArtUri/",
				baseExtension: ".json",
				merkleRoot:
					"0x0000000000000000000000000000000000000000000000000000000000000000",
				payees: [],
				shares: [],
				maxTokenId: 1,
				mintPrice: toTokens("1"),
				nftPerAddressLimit: 0,
				shouldWhitelistCheck: false,
				owner: "",
			},

			token2: {
				name: "OasisX721Implementation",
				symbol: "OasisXI",
				baseTokenURI: "ipfs//revealedArtUri/",
				notRevealedUri: "ipfs://notRevealedArtUri/",
				baseExtension: ".json",
				merkleRoot:
					"0x0000000000000000000000000000000000000000000000000000000000000000",
				payees: [],
				shares: [],
				maxTokenId: 1,
				mintPrice: toTokens("1"),
				nftPerAddressLimit: 0,
				shouldWhitelistCheck: false,
				owner: "",
			},
		},
		oasis1155: {
			token1: {
				name: "OasisX1155Implementation",
				symbol: "OasisXI",
				uri: "ipfs://revealedArtUri/",
				merkleRoot:
					"0x0000000000000000000000000000000000000000000000000000000000000000",
				payees: [],
				shares: [],
				tokenIds: [],
				tokenSupplies: [],
				maxTokenId: 1,
				mintPrice: toTokens("1"),
				mintsPerAddressLimit: 1,
				shouldWhitelistCheck: false,
			},
			token2: {
				name: "OasisX1155Implementation",
				symbol: "OasisXI",
				uri: "ipfs://revealedArtUri/",
				merkleRoot:
					"0x0000000000000000000000000000000000000000000000000000000000000000",
				payees: [],
				shares: [],
				tokenIds: [],
				tokenSupplies: [],
				maxTokenId: 1,
				mintPrice: toTokens("1"),
				mintsPerAddressLimit: 1,
				shouldWhitelistCheck: false,
			},
		},
		launchpad: {
			protocolFee: 200,
		},
		protocolFees: {
			minFee: 100,
			maxFee: 200,
			maxRange: 1,
			minRange: 0.5,
		},
		oasisnft: {
			name: "OasisX NFT collection",
			symbol: "OasisXNFT",
			uri: "ipfs://replaceUriHere/",
			tokenIds: [0, 1, 2],
			mintCostPerTokenId: [0, toTokens("0.01"), toTokens("0.05")],
			mbenefeciary: "0xxxxxxxxxxxxxxxx",
		},
	},
	base: {
		oasis721: {
			token1: {
				name: "OasisX721",
				symbol: "OAS",
				baseTokenURI: "ipfs://",
				notRevealedUri: "ipfs://721notrevealed/",
				baseExtension: "ipfs://721extension/",
				merkleRoot:
					"0x0000000000000000000000000000000000000000000000000000000000000000",
				payees: [
					"0xxxxxxxxxxxxxxxx",
					"0xxxxxxxxxxxxxxxx",
				],
				shares: [10, 7],
				maxTokenId: 1000,
				mintPrice: toTokens("2"),
				nftPerAddressLimit: 3,
				shouldWhitelistCheck: true,
				owner: "0xxxxxxxxxxxxxxxx",
				reveal: false,
			},
			token2: {
				name: "OasisX721 (2)",
				symbol: "OAS2",
				baseTokenURI: "ipfs:222//",
				notRevealedUri: "ipfs://721notrevealed/222//",
				baseExtension: "ipfs://721extension/222//",
				merkleRoot:
					"0x0000000000000000000000000000000000000000000000000000000000000000",
				payees: ["0xxxxxxxxxxxxxxxx"],
				shares: [5],
				maxTokenId: 3333,
				mintPrice: toTokens("1"),
				nftPerAddressLimit: 5,
				shouldWhitelistCheck: true,
				owner: "0xxxxxxxxxxxxxxxx",
				reveal: false,
			},
		},
		oasis1155: {
			token1: {
				name: "OasisX1155",
				symbol: "OAS1155",
				uri: "ipfs:///1155",
				merkleRoot:
					"0x0000000000000000000000000000000000000000000000000000000000000000",
				payees: [
					"0xxxxxxxxxxxxxxxx",
					"0xxxxxxxxxxxxxxxx",
				],
				shares: [2, 7],
				tokenIds: [4, 9, 10],
				tokenSupplies: [4, 4, 4],
				maxTokenId: 20,
				mintPrice: toTokens("1"),
				mintsPerAddressLimit: 7,
				shouldWhitelistCheck: true,
			},
			token2: {
				name: "OasisX1155 (2)",
				symbol: "OAS1155(2)",
				uri: "ipfs:///1155",
				merkleRoot:
					"0x0000000000000000000000000000000000000000000000000000000000000000",
				payees: [
					"0xxxxxxxxxxxxxxxx",
					"0xxxxxxxxxxxxxxxx",
				],
				shares: [2, 5],
				tokenIds: [4, 9, 10],
				tokenSupplies: [4, 4, 4],
				maxTokenId: 20,
				mintPrice: toTokens("1"),
				mintsPerAddressLimit: 7,
				shouldWhitelistCheck: true,
			},
		},
		storefront: {
			name: "OasisX Storefront",
			symbol: "OasisXStorefront",
			registry: "",
			templateURI: "https://oasisxassets.cryptoware.me/0x",
			migrationAddress: "0x0000000000000000000000000000000000000000",
		},
		launchpad: {
			protocolFee: 200,
		},
		protocolFees: {
			minFee: 100,
			maxFee: 200,
			maxRange: 80,
			minRange: 10,
		},
		oasisnft: {
			name: "OasisX NFT collection",
			symbol: "OasisXNFT",
			uri: "///ipfs://",
			tokenIds: [0, 1, 2],
			mintCostPerTokenId: [0, toTokens("0.01"), toTokens("0.05")],
			mbenefeciary: "0xxxxxxxxxxxxxxxx",
		},
	},
};
