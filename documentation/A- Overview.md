<!-- TITLE: Protocol Overview -->
<!-- SUBTITLE: An overview of the OasisX Protocol -->

# Overview

OasisX is a protocol for the decentralized exchange of any digital assets. OasisX uses a hybrid model: signed orders are transmitted and stored off-chain, while all state transitions are settled on-chain, meaning that protocol users need not trust any counterparty with custody of their assets. Unlike prior protocols, OasisX is representation-agnostic: the protocol uses a proxy account system to abstract over the space of Ethereum transactions, allowing arbitrary state transitions to be bought and sold without the deployment of any additional smart contracts. OasisX supports buy- and sell-side orders, fixed price and auction pricing, and asset criteria specification — orders may be placed for specific assets, or for any assets with specific properties. The OasisX protocol is a fork of the Wyvern Protocol V3 with specific changes made for OasisX.