// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title TestERC20
 * @notice erc20 contract for unit tests
 * @author OasisX Protocol | cryptoware.eth
 */
contract TestERC20 is ERC20 {
    constructor() ERC20("test", "TST") {}

    function mint(address to, uint256 value) public returns (bool) {
        _mint(to, value);
        return true;
    }
}
