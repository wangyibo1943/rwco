// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ReputationNFT is ERC721Enumerable, Ownable {
    address public minter;

    constructor() ERC721("Reputation NFT", "REP") {}

    function setMinter(address _minter) external onlyOwner {
        minter = _minter;
    }

    function mint(address to, uint256 tokenId) external {
        require(msg.sender == minter, "Not authorized");
        _safeMint(to, tokenId);
    }

    // 禁止转让
    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        override
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        require(
            from == address(0) || to == address(0),
            "Reputation NFTs are non-transferable"
        );
    }
}
