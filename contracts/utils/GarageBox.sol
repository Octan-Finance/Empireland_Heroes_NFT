// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract GarageBox {
    function walletOfOwner(address _owner) public view returns (uint256[] memory) {}
    function ownerOf(uint256 tokenId) public view virtual returns (address) {}
}