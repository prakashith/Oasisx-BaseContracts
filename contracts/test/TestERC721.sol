// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../node_modules/@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "../../node_modules/@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title TestERC721
 * @notice erc721 contract for unit tests
 * @author OasisX Protocol | cryptoware.eth
 */
contract TestERC721 is ERC721 {
    constructor() ERC721("test", "TST") {
        mint(msg.sender, 1);
        mint(msg.sender, 2);
        mint(msg.sender, 3);
    }

    function mint(address to, uint256 tokenId) public returns (bool) {
        _mint(to, tokenId);
        return true;
    }

    function mint(
        address to,
        uint256 tokenId,
        bytes memory extraBytes
    ) public {
        address creator = address(uint160(tokenId >> 96));
        require(
            creator == msg.sender ||
                super.isApprovedForAll(creator, msg.sender),
            "Sender not authorized to mint this token"
        );
        _safeMint(to, tokenId, extraBytes);
    }
}
