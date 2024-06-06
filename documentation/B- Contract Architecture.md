<!-- TITLE: Contract Architecture -->
<!-- SUBTITLE: OasisX Protocol Contract Architecture -->

# Motivation
OasisX protocol's Solidity contracts are structured to (a) provide the necessary least-authority permissioning and separation of concerns, (b) facilitate user-transparent core protocol upgrades, and (c) maximize code understandability, in that order of precedence.
# Contracts
## Registry
The Registry contracts proxy all user authentication. Protocol users transfer assets to a personal proxy contract and approve token transfers through a token proxy contract. This has two advantages over approving transfers from or transferring assets to the exchange contracts directly: it vastly reduces the attack surface of the complex exchange logic (as the exchange contracts never need to hold assets themselves), and it allows users to use new protocol versions without moving assets to new contracts or approving tokens for use by new contracts.
### AuthenticatedProxy
An AuthenticatedProxy contract instance is created, once, by each user of the OasisX Protocol to hold assets on that user's behalf. The user can execute arbitrary calls through the AuthenticatedProxy contract at any time (to withdraw assets, for example), and can easily seralize multiple calls through the `DELEGATECALL` opcode (a functionality not provided by non-contract Ethereum accounts). Exchange contracts authorized by the ProxyRegistry can also execute arbitrary calls on behalf of the user; the logic in the exchange contracts must ensure that the user has signed a valid order to execute the call in question.
### TokenTransferProxy
The TokenTransferProxy contract uses the ProxyRegistry's authentication table, allowing users to call ERC20 `approve` once for all future protocol versions.
### ProxyRegistry
The ProxyRegistry contract, owned by the OasisX, keeps an authentication table to facilitate protocol upgrades and a contract table to map users to *AuthenticatedProxy* contracts. They can authorize new protocol versions, granting them access to the *TokenTransferProxy* contract and all *AuthenticatedProxy* contracts, after a mandatory 2-week delay (to allow users time to move their tokens and assets if needed).
## Exchange
The Exchange contracts implement the core protocol logic. The protocol can be upgraded by deploying new versions of these contracts, which then must be authorized by OasisX before they can access user tokens and assets.
### Exchange
The Exchange contract simply wraps the *ExchangeCore* internal functions with public functions exposing arrays instead of structs, as Solidity's external struct ABI support is not yet finalized.
### ExchangeCore
The ExchangeCore contract is the workhorse of the OasisX Protocol and contains all the juicy logic for both order validation — metadata agreement, signature verification, price/fee calculation, calldata unification — and order execution — token transfer, proxy contract retrieval, call execution, and replay prevention.