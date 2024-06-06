<!-- TITLE: Launchpad Documentation -->
<!-- SUBTITLE: Description of the launchpad contracts -->

# OasisX Launchpad Guide

OasisXLaunchFactory was developed using Minimal Proxy Contract pattern. It allows users to simply and cheaply clone contract functionality in an immutable way, creating proxy contracts and delegating all calls to the base implementation. In other words, the rationale behind the concept is to deploy a very cheap minimal proxy contract that points to the huge contract already on-chain, instead of deploying a huge contract multiple times.

## Proxy Functionality

### Receive Data

This data is known as calldata, it is sent to the contract in a transaction, so we need to copy that into memory to be able to later forward it.
EVM instruction: `CALLDATACOPY`, it copies input in current environment to memory and takes three arguments:

1. Memory Slot where calldata will be copied.
2. Where that data begins.
3. Amount of data we want to copy.

### Delegate the Call

The next step is to forward the received data to the base implementation contract using the `DELEGATECALL` instruction. It message-calls into an account with an alternative account's code while persisting the current values for sender and value. It takes six arguments:

1. Amount of gas we want to forward.
2. Address of contract the proxy delegates the call to.
3. Memory slot where forwarded data starts.
4. Size of forwarded data.
5. Memory slot where the returned data will be written.
6. Size of returned data to write in memory.

### External Call result

To be able to retrieve the data returned from the external call, we use a specific EVM instruction called `RETURNDATACOPY` which will copy the output data from the previous call into memory. This intruction takes three arguments:

1. Location in memory to copy the returned data.
2. Start of the returned data.
3. Amount of the return data to copy.

### Final Stage: return or revert

Without diving into much details, compiled smart contract bytecode executes as a number of EVM opcodes, which perform standard stack operations.

So, we received some data, then we executed a `DELEGATECALL` instruction, and finally copied the returned data into memory. To decide if the call should be returned or reverted, we look at the success item in the stack. If success is 0, the `DELEGATECALL` has failed and thus will be reverted. However, if success is not 0, the `DELEGATECALL` has succeeded and thus will be returned.

## Usage

The concept described above was implemented in the NFT factory of OasisX. Two base contracts were introduced:

1. OasisXNFT721: Uses the ERC-721A standard which is an improvement to the ERC-721. Its infrastructure permits low network baseFee, allowing users to mint at low transaction gas fees.
2. OasisXNFT1155: Uses the ERC-1155 Multi-Token Standard.

### Clone from frontend dApp

To clone a proxy of OasisXNFT721 base contract, we need to call the 'create721' function located in the OasisXLaunchFactory contract. We can do so by creating an environment in our frontend containing the abis of the contracts required and their respective contract addresses. Then we create a hook and pass all necessary params. For example:

```
 const useCreateClone721 = () => {
  const gas = useGasPrice();
  const accessFee = LaunchpadAccessFee(1);
  const payable = LaunchpadPaymentMethod();
  const {
    state: cloneState,
    events: cloneEvents,
    send,
  } = useOasisXMinimalFactoryMethod('create721');
  const create721Clone = (
    name,
    symbol,
    baseTokenURI,
    notRevealedUri,
    merkleRoot,
    payees,
    shares,
    maxTokenId,
    mintPrice,
    mintsPerAddressLimit,
    reveal,
  ) => {
    send(
      defaultAbiCoder.encode(
        [
          'string',
          'string',
          'string',
          'string',
          'bytes32',
          'address[]',
          'uint256[]',
          'uint256',
          'uint256',
          'uint64',
          'bool',
        ],
        [
          name,
          symbol,
          baseTokenURI,
          notRevealedUri,
          merkleRoot,
          payees,
          shares,
          maxTokenId,
          mintPrice,
          mintsPerAddressLimit,
          reveal,
        ],
      ),
      {
        gasPrice: gas,
        gasLimit: 700000,
        value: payable ? accessFee.toString() : '0',
      },
    );
  };
  return {
    cloneState,
    cloneEvents,
    create721Clone,
  };
};
```

The same approach can be used to clone the OasisXNFT1155 Base contract, using the params required by the 'create1155' function.

### Using the Cloned Contract

Once our clone is succesful, we can now communicate directly with the proxy contract.
Note: We can get the proxy contract address, by looking into the event emitted by the clone function.

The proxy contract acts like a normal ERC721 (or ERC1155). For example the mint function can be called by creating a hook similiar to this:

```
const useLaunchpadMint = ({ proxyAddress = ZERO_ADDRESS, contractType }) => {
  const gas = useGasPrice();
  const {
    state: mintingState,
    events: mintingEvents,
    send,
  } = useOasisXLaunchpad(proxyAddress, contractType, 'mint');
  const mint = (to, amount, proof, mintPrice) => {
    return send(to, amount, proof, {
      gasPrice: gas,
      gasLimit: 150000,
      value: mintPrice,
    });
  };
  return {
    mintingState,
    mintingEvents,
    mint,
  };
};
```

## Extra Features

### Acess Control

OasisXLaunchFactory introduces specific access restrictions, defining conditions of its usage. Users will be able to use this protocol by either:

1. Minting an OasisX1155 token: TokenID 0 will be free of charge and will allow users to only clone from the OasisXNFT1155 implementation.
   Holders of TokenID 1 will have access to the OasisXNFT721 implementation, however their token will get burned after the clone.
   Holders of TokenID 2 have unrestricted access to all features.

2. Protocol Fee: OasisXLaunchFactory's access can be shifted to accept a protocol fee for usage of the contract. This is done by calling the changeAccessFee() method. The access can always be changed again later on by calling the method again.

### Malleable Factory

Base Implementations OasisXNFT721 and OasisXNFT1155 can be changed by calling the change721Implementation and change1155Implementation respectively.
