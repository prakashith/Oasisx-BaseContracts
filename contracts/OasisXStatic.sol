//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./static/StaticERC20.sol";
import "./static/StaticERC721.sol";
import "./static/StaticERC1155.sol";
import "./static/StaticUtil.sol";
import "./static/StaticMarket.sol";

/**
 * @title OasisXStatic
 * @notice static call functions
 * @author OasisX Protocol | cryptoware.eth
 */
contract OasisXStatic is
    StaticERC20,
    StaticERC721,
    StaticERC1155,
    StaticUtil,
    StaticMarket
{
    string public constant name = "OasisX Static";

    constructor(address atomicizerAddress) {
        require
        (
            atomicizerAddress != address(0),
            "OasisXAtomicizer: Atomicizer address cannot be 0"
        );
        atomicizer = atomicizerAddress;
        atomicizerAddr = atomicizerAddress;
    }
}
