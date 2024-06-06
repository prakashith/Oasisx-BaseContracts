// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract ExchangeInterface {
    function approveOrder(
        address registry,
        address maker,
        address staticTarget,
        bytes4 staticSelector,
        bytes calldata staticExtradata,
        uint256 maximumFill,
        uint256 listingTime,
        uint256 expirationTime,
        uint256 salt,
        bool orderbookInclusionDesired
    ) external {}
}

contract ProxyInterface {
    function registerProxy() external {}
}

/**
 * @title TestSmartContractWallet
 * @dev Test contract for Smart contract wallets, proxies some calls an EOA wallet would make to setup on OasisX.
 * @author OasisX Protocol | cryptoware.eth
 */
contract TestSmartContractWallet {
    event Deposit(address indexed _from, uint256 indexed _id, uint256 _value);

    constructor() {}

    /// @notice Called by atomicMatch when this contract is taker for an order with eth value exchanged.
    receive() external payable {
        // Use more than 2300 gas to test gas limit for send and transfer
        emit Deposit(msg.sender, 0, msg.value);
        emit Deposit(msg.sender, 1, msg.value);
        emit Deposit(msg.sender, 2, msg.value);
    }

    /// @notice Proxy to exchange
    function approveOrder(
        address exchange,
        address registry,
        address maker,
        address staticTarget,
        bytes4 staticSelector,
        bytes calldata staticExtradata,
        uint256 maximumFill,
        uint256 listingTime,
        uint256 expirationTime,
        uint256 salt,
        bool orderbookInclusionDesired
    ) public returns (bool) {
        ExchangeInterface(exchange).approveOrder(
            registry,
            maker,
            staticTarget,
            staticSelector,
            staticExtradata,
            maximumFill,
            listingTime,
            expirationTime,
            salt,
            orderbookInclusionDesired
        );
        return true;
    }

    /// @notice Proxy to registry
    function registerProxy(address registry) public returns (bool) {
        ProxyInterface(registry).registerProxy();
        return true;
    }

    /// @notice Proxy to erc721
    function setApprovalForAll(
        address registry,
        address erc721,
        bool approved
    ) public returns (bool) {
        ERC721(erc721).setApprovalForAll(registry, approved);
        return true;
    }
}
