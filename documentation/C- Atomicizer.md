<!-- TITLE: Atomicizer Guide -->
<!-- SUBTITLE: How to use the Atomicizer library contract to combine multiple operations into a single transaction -->

# Atomicizer Guide

The Atomicizer libary provides a generic way to dynamically combine multiple CALL operations into a single transaction. This may be useful in situations where you want to execute multiple operations atomically, such as selling three CryptoKitties in a single order, deploying a contract and setting an ENS address record, or calling ERC20 `approve` and `transferFrom` with one transaction instead of two. In order to use the Atomicizer library, you must call it from an account capable of executing the `DELEGATECALL` opcode - so standard Ethereum accounts will not work, but the Registry proxy accounts will. The Atomicizer library was written primarily for the Wyvern Protocol and adapted for OasisX Protocol, but it is permissionless and can be used by any Ethereum account for any purpose.

## Basics

A Library contract to sequence sub-calls atomically:

```solidity
function atomicize (address[] addrs, uint[] values, uint[] calldataLengths, bytes calldatas)
```

These four parameters allow you to pass a list of CALL operations (standard Ethereum transactions), to be executed in series. `addrs`, `values`, and `calldataLengths` must all have the same number of elements, and the length of `calldatas` must be equal to the sum of `calldataLengths` (this is just a way to pass a two-dimensional byte array, which Solidity does not natively support).

For each index, in series, the library parses out the calldata for that index then executes:

```solidity
require(addrs[i].call.value(values[i])(calldata));
```

This means that execution is "all-or-nothing". If any of the operations fail, the Atomicizer library will stop execution, refund remaining gas, and throw an error, reverting all previous state changes - so, if you atomicize three `transfer` calls of individual CryptoKitties, either all of the CryptoKitties will be transferred or none of them will.

## Usage

Using a standard web3 API library, construct the transactions as you would normally, but instead of calling `send()`, call `encodeABI()` and then pass them to the Atomicizer, as follows:

```javascript
const atomicizerAddress = '0x118e7583CB46CD77B39b660469D1c8F7Fe49fBdd'
const atomicize = {'constant': false, 'inputs': [{'name': 'addrs', 'type': 'address[]'}, {'name': 'values', 'type': 'uint256[]'}, {'name': 'calldataLengths', 'type': 'uint256[]'}, {'name': 'calldatas', 'type': 'bytes'}], 'name': 'atomicize', 'outputs': [], 'payable': false, 'stateMutability': 'nonpayable', 'type': 'function'}

const transactions = [
   {calldata: '...', value: '...', address: '...'},
	 ...
]

const params = [
  transactions.map(t => t.address),
  transactions.map(t => t.value),
  transactions.map(t => (t.calldata.length - 2) / 2), // subtract 2 for '0x', divide by 2 for hex
  transactions.map(t => t.calldata).reduce((x, y) => x + y.slice(2)) // cut off the '0x'
]

const encoded = web3.eth.abi.encodeFunctionCall(atomicize, params)
```

## Examples

Any combination of transactions (within the Ethereum block gas limit) can be atomicized, the following are just a few examples.

### Sending 0.001 Ether to two addresses in the same transaction

```javascript
const Web3 = require("web3");
const web3 = new Web3();

const atomicizerAddress = "0x118e7583CB46CD77B39b660469D1c8F7Fe49fBdd";
const atomicize = {
  constant: false,
  inputs: [
    { name: "addrs", type: "address[]" },
    { name: "values", type: "uint256[]" },
    { name: "calldataLengths", type: "uint256[]" },
    { name: "calldatas", type: "bytes" },
  ],
  name: "atomicize",
  outputs: [],
  payable: false,
  stateMutability: "nonpayable",
  type: "function",
};

const transactions = [
  {
    calldata: "0x",
    value: web3.utils.toWei("0.001"),
    address: "0x0084a81668b9a978416abeb88bc1572816cc7cac",
  }, // send 0.001 Ether to 0x0084a81668b9a978416abeb88bc1572816cc7cac
  {
    calldata: "0x",
    value: web3.utils.toWei("0.001"),
    address: "0xa839D4b5A36265795EbA6894651a8aF3d0aE2e68",
  }, // send 0.001 Ether to 0xa839D4b5A36265795EbA6894651a8aF3d0aE2e68
];

const params = [
  transactions.map((t) => t.address),
  transactions.map((t) => t.value),
  transactions.map((t) => (t.calldata.length - 2) / 2), // subtract 2 for '0x', divide by 2 for hex
  transactions.map((t) => t.calldata).reduce((x, y) => x + y.slice(2)), // cut off the '0x'
];

console.log(params);

const encoded = web3.eth.abi.encodeFunctionCall(atomicize, params);

console.log(atomicizerAddress, encoded);
```

### Selling two CryptoKitties with one order

```javascript
const deepcopy = require("deepcopy");
const Web3 = require("web3");
const web3 = new Web3("https://mainnet.infura.io");
const { OasisXProtocol } = require("OasisX-js");
const { schemas } = require("OasisX-schemas");
const protocolInstance = new OasisXProtocol(web3.currentProvider, {
  network: "main",
});

const CryptoKitties = schemas.main.filter((s) => s.name === "CryptoKitties")[0];

// Predetermined buyer
const buyer = "0x0084a81668B9A978416aBEB88bC1572816cc7cAC";
const seller = "0x0084a81668B9A978416aBEB88bC1572816cc7cAC";

// Two kitties to be sold in one order
const kitties = ["591654", "570186"];

const transactions = kitties.map((kitty) => {
  const transfer = CryptoKitties.functions.transfer(kitty);
  const encoded = web3.eth.abi.encodeFunctionCall(transfer, [buyer, kitty]);
  const calldata = encoded;
  const address = transfer.target;
  const value = "0";
  return {
    calldata,
    address,
    value,
  };
});

const atomicized =
  protocolInstance.OasisXAtomicizer.atomicize.getABIEncodedTransactionData(
    transactions.map((t) => t.address),
    transactions.map((t) => t.value),
    transactions.map((t) => (t.calldata.length - 2) / 2), // subtract 2 for '0x', divide by 2 for hex
    transactions.map((t) => t.calldata).reduce((x, y) => x + y.slice(2)) // cut off the '0x'
  );

const calldata = atomicized;
const replacementPattern = "0x"; // exact match, no replacement

const sellOrder = {
  registry: registry.address,
  maker: buyer,
  staticTarget: statici.address,
  staticSelector: selectorOne,
  staticExtradata: extradataOne,
  maximumFill: 1,
  listingTime: OasisXProtocol.blockTime,
  expirationTime: OasisXProtocol.blockTime.add("3", "D"),
  salt: OasisXProtocol.generatePseudoRandomSalt().toString(),
};

// Create the matching buy-side order
const buyOrder = deepcopy(sellOrder);
buyOrder.maker = buyer;

try {
  (async () => {
    // Check that orders can match
    const ordersCanMatch =
      await protocolInstance.OasisXExchange.ordersCanMatch_.callAsync(
        [
          buyOrder.exchange,
          buyOrder.maker,
          buyOrder.taker,
          buyOrder.feeRecipient,
          buyOrder.target,
          buyOrder.staticTarget,
          buyOrder.paymentToken,
          sellOrder.exchange,
          sellOrder.maker,
          sellOrder.taker,
          sellOrder.feeRecipient,
          sellOrder.target,
          sellOrder.staticTarget,
          sellOrder.paymentToken,
        ],
        [
          buyOrder.makerRelayerFee,
          buyOrder.takerRelayerFee,
          buyOrder.makerProtocolFee,
          buyOrder.takerProtocolFee,
          buyOrder.basePrice,
          buyOrder.extra,
          buyOrder.listingTime,
          buyOrder.expirationTime,
          buyOrder.salt,
          sellOrder.makerRelayerFee,
          sellOrder.takerRelayerFee,
          sellOrder.makerProtocolFee,
          sellOrder.takerProtocolFee,
          sellOrder.basePrice,
          sellOrder.extra,
          sellOrder.listingTime,
          sellOrder.expirationTime,
          sellOrder.salt,
        ],
        [
          buyOrder.feeMethod,
          buyOrder.side,
          buyOrder.saleKind,
          buyOrder.howToCall,
          sellOrder.feeMethod,
          sellOrder.side,
          sellOrder.saleKind,
          sellOrder.howToCall,
        ],
        buyOrder.calldata,
        sellOrder.calldata,
        buyOrder.replacementPattern,
        sellOrder.replacementPattern,
        buyOrder.staticExtradata,
        sellOrder.staticExtradata
      );
    console.log("ordersCanMatch: " + ordersCanMatch);

    // Encode the atomic match call
    const matchEncoded =
      await protocolInstance.OasisXExchange.atomicMatch_.getABIEncodedTransactionData(
        [
          buyOrder.exchange,
          buyOrder.maker,
          buyOrder.taker,
          buyOrder.feeRecipient,
          buyOrder.target,
          buyOrder.staticTarget,
          buyOrder.paymentToken,
          sellOrder.exchange,
          sellOrder.maker,
          sellOrder.taker,
          sellOrder.feeRecipient,
          sellOrder.target,
          sellOrder.staticTarget,
          sellOrder.paymentToken,
        ],
        [
          buyOrder.makerRelayerFee,
          buyOrder.takerRelayerFee,
          buyOrder.makerProtocolFee,
          buyOrder.takerProtocolFee,
          buyOrder.basePrice,
          buyOrder.extra,
          buyOrder.listingTime,
          buyOrder.expirationTime,
          buyOrder.salt,
          sellOrder.makerRelayerFee,
          sellOrder.takerRelayerFee,
          sellOrder.makerProtocolFee,
          sellOrder.takerProtocolFee,
          sellOrder.basePrice,
          sellOrder.extra,
          sellOrder.listingTime,
          sellOrder.expirationTime,
          sellOrder.salt,
        ],
        [
          buyOrder.feeMethod,
          buyOrder.side,
          buyOrder.saleKind,
          buyOrder.howToCall,
          sellOrder.feeMethod,
          sellOrder.side,
          sellOrder.saleKind,
          sellOrder.howToCall,
        ],
        buyOrder.calldata,
        sellOrder.calldata,
        buyOrder.replacementPattern,
        sellOrder.replacementPattern,
        buyOrder.staticExtradata,
        sellOrder.staticExtradata,
        [27, 27], // No signatures, order previously approved
        [
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        ]
      );
    console.log(matchEncoded);
  })();
} catch (e) {
  console.log(e);
}
```
