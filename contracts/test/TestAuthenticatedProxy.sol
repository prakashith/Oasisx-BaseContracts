//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../registry/AuthenticatedProxy.sol";

/**
 * @title TestAuthenticatedProxy
 * @notice for delegateCall testing
 * @author OasisX Protocol | cryptoware.eth
 */
contract TestAuthenticatedProxy is AuthenticatedProxy {
    function setUser(address newUser) public {
        registry.transferAccessTo(user, newUser);
        user = newUser;
    }
}
