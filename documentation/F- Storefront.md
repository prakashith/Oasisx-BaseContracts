<!-- TITLE: Storefront Documentation -->
<!-- SUBTITLE: Description of Storefront functionality -->

# OasisX StoreFront

OasisX allows new creators to mint their own NFTs via a shared ERC1155 smart contract known as the OasisXStoreFront, meaning that only one instance of the contract is needed.

## Design Notes

### Token Identifiers

Token ids of the OasisXStoreFront differ from usual token ids in the sense of: they are a concatenation of:

1. creator: hex address of the creator of the token. 160 bits
2. index: Index for this token (the regular ID), up to 2^56 - 1. 56 bits
3. supply: Supply cap for this token, up to 2^40 - 1 (1 trillion). 40 bits

### Lazy mint

Lazy minting is when an NFT is available off-chain and only gets minted once a sale takes place. This means that the artist does not have to pay any upfront gas fees to mint their NFTs, essentially paying the fees only once the token is purchased.

### Transfer Function

The safeTransferFrom function in the OasisXStorefront differs from standard safeTransferFrom functions, where it uses the balanceOf function to check whether this token has already been minted. If the answer is yes, then it acts like a normal safeTransferFrom and transfers ownership of the token to the new address. However, if the answer is no, then it first mints this token and then transfers ownership.
